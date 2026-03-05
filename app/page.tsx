"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileArchive,
  FileText,
  Github,
  LayoutGrid,
  Merge,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Twitter,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { PDFDocument } from "pdf-lib";

import type { CompressionLevel } from "@/types";
import { compressPDF } from "@/utils/pdfCompressor";
import { mergePDFs } from "@/utils/pdfMerger";
import SplashScreen from "@/components/splash/SplashScreen";
import { useOneTimeSplash } from "@/hooks/use-one-time-splash";
import PageEditor from "@/components/PageEditor";

type Mode = "compress" | "merge" | "edit";

type WorkFile = {
  id: string;
  file: File;
  pageCount: number | null;
};

type CompressionResult = {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
  url: string;
};

type MergeResult = {
  name: string;
  size: number;
  url: string;
};

type CompressionPresetMeta = {
  label: string;
  targetReduction: number;
  colorClass: string;
  tooltip: string;
};

const MAX_FILES = 20;

const PRESET_META: Record<CompressionLevel, CompressionPresetMeta> = {
  low: {
    label: "Archive",
    targetReduction: 25,
    colorClass: "bg-emerald-500",
    tooltip: "Best for signed contracts, presentations, and documents where visual fidelity matters most.",
  },
  medium: {
    label: "Balanced",
    targetReduction: 45,
    colorClass: "bg-sky-500",
    tooltip: "Recommended for day-to-day sharing. Good size reduction without obvious quality loss.",
  },
  high: {
    label: "Web",
    targetReduction: 70,
    colorClass: "bg-rose-500",
    tooltip: "Use when upload speed and file size are priority, such as forms, drafts, or quick review files.",
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 2)} ${units[power]}`;
}

function getFileSignature(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("compress");
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("medium");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [isWorking, setIsWorking] = useState(false);
  const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [notice, setNotice] = useState("Upload PDF files to get started.");
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const { showSplash, appReady } = useOneTimeSplash({ durationMs: 1800 });

  const clearCompressionResults = useCallback(() => {
    setCompressionResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
  }, []);

  const clearMergeResult = useCallback(() => {
    setMergeResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const resetSession = useCallback(() => {
    clearCompressionResults();
    clearMergeResult();
    setFiles([]);
    setProgressMap({});
    setNotice("Session reset.");
  }, [clearCompressionResults, clearMergeResult]);

  const removeDuplicates = useCallback(() => {
    setFiles((prev) => {
      const seen = new Set<string>();
      const next = prev.filter((entry) => {
        const signature = getFileSignature(entry.file);
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });

      const removed = prev.length - next.length;
      setNotice(removed > 0 ? `Removed ${removed} duplicate file${removed > 1 ? "s" : ""}.` : "No duplicates found.");
      return next;
    });
  }, []);

  const addFiles = useCallback(
    async (incomingFiles: File[]) => {
      const accepted = incomingFiles.filter((file) => file.type === "application/pdf");

      if (!accepted.length) {
        setNotice("Only PDF files are accepted.");
        return;
      }

      const existing = new Set(files.map((entry) => getFileSignature(entry.file)));
      const unique = accepted.filter((file) => !existing.has(getFileSignature(file)));

      if (!unique.length) {
        setNotice("All selected files are already in the queue.");
        return;
      }

      const slots = Math.max(0, MAX_FILES - files.length);
      const batch = unique.slice(0, slots);

      if (!batch.length) {
        setNotice(`Queue limit reached (${MAX_FILES} files).`);
        return;
      }

      const draft = batch.map((file) => ({ id: makeId(), file, pageCount: null }));
      setFiles((prev) => [...prev, ...draft]);
      setNotice(`Added ${batch.length} file${batch.length > 1 ? "s" : ""}.`);

      await Promise.all(
        draft.map(async (entry) => {
          try {
            const bytes = await entry.file.arrayBuffer();
            const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const pages = doc.getPageCount();
            setFiles((prev) => prev.map((file) => (file.id === entry.id ? { ...file, pageCount: pages } : file)));
          } catch {
            setFiles((prev) => prev.map((file) => (file.id === entry.id ? { ...file, pageCount: 0 } : file)));
          }
        })
      );
    },
    [files]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    noClick: true,
    onDrop: (dropped) => {
      void addFiles(dropped);
    },
    accept: { "application/pdf": [".pdf"] },
    maxFiles: MAX_FILES,
  });

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((entry) => entry.id !== id));
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const recommendedLevel = useMemo<CompressionLevel>(() => {
    const totalSize = files.reduce((sum, entry) => sum + entry.file.size, 0);
    const averagePages =
      files.length > 0
        ? files.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0) / files.length
        : 0;

    if (totalSize > 50 * 1024 * 1024 || averagePages > 35) return "high";
    if (totalSize < 8 * 1024 * 1024 && averagePages < 10) return "low";
    return "medium";
  }, [files]);

  const totalSize = useMemo(() => files.reduce((sum, entry) => sum + entry.file.size, 0), [files]);
  const totalPages = useMemo(() => files.reduce((sum, entry) => sum + (entry.pageCount ?? 0), 0), [files]);

  const compressionStats = useMemo(() => {
    const original = compressionResults.reduce((sum, result) => sum + result.originalSize, 0);
    const compressed = compressionResults.reduce((sum, result) => sum + result.compressedSize, 0);
    const saved = Math.max(0, original - compressed);
    const savedPct = original > 0 ? (saved / original) * 100 : 0;
    return { original, compressed, saved, savedPct };
  }, [compressionResults]);

  const handleCompress = useCallback(async () => {
    if (!files.length) {
      setNotice("Add at least one PDF before compressing.");
      return;
    }

    setIsWorking(true);
    clearCompressionResults();
    clearMergeResult();
    setProgressMap({});

    try {
      const results: CompressionResult[] = [];

      for (const entry of files) {
        const blob = await compressPDF(entry.file, compressionLevel, (progress) => {
          setProgressMap((prev) => ({ ...prev, [entry.id]: progress }));
        });

        results.push({
          id: entry.id,
          name: entry.file.name,
          originalSize: entry.file.size,
          compressedSize: blob.size,
          blob,
          url: URL.createObjectURL(blob),
        });
      }

      setCompressionResults(results);
      setNotice(`Compression complete for ${results.length} file${results.length > 1 ? "s" : ""}.`);
    } catch (error) {
      console.error(error);
      setNotice("Compression failed for one or more files.");
    } finally {
      setIsWorking(false);
    }
  }, [clearCompressionResults, clearMergeResult, compressionLevel, files]);

  const handleZipDownload = useCallback(async () => {
    if (!compressionResults.length) return;

    const zip = new JSZip();
    compressionResults.forEach((result) => {
      zip.file(`compressed_${result.name}`, result.blob);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "compressed_pdfs.zip");
  }, [compressionResults]);

  const handleMerge = useCallback(async () => {
    if (!files.length) {
      setNotice("Add files before merging.");
      return;
    }

    setIsWorking(true);
    clearCompressionResults();
    clearMergeResult();

    try {
      const mergedBlob = await mergePDFs(files.map((entry) => entry.file));
      const url = URL.createObjectURL(mergedBlob);
      const name = `merged_${new Date().toISOString().replace(/[:.-]/g, "")}.pdf`;

      setMergeResult({ name, size: mergedBlob.size, url });
      setNotice("Merge complete.");
    } catch (error) {
      console.error(error);
      setNotice("Merge failed. Check if files are valid PDFs.");
    } finally {
      setIsWorking(false);
    }
  }, [clearCompressionResults, clearMergeResult, files]);

  useEffect(() => {
    return () => {
      compressionResults.forEach((result) => URL.revokeObjectURL(result.url));
      if (mergeResult) URL.revokeObjectURL(mergeResult.url);
    };
  }, [compressionResults, mergeResult]);

  return (
    <>
      <AnimatePresence>{showSplash ? <SplashScreen /> : null}</AnimatePresence>
      <motion.main
        initial={false}
        animate={{
          opacity: appReady ? 1 : 0,
          y: appReady ? 0 : 10,
          filter: appReady ? "blur(0px)" : "blur(4px)",
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`min-h-screen bg-slate-100 text-slate-900 ${appReady ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h1 className="font-[var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              Ship Smaller PDFs, Faster
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
              A private, all-in-one PDF workspace to optimize, organize, and prepare documents for any workflow. Everything stays on your device for privacy and control.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <SummaryCard label="Files" value={String(files.length)} />
              <SummaryCard label="Total Size" value={formatBytes(totalSize)} />
              <SummaryCard label="Total Pages" value={String(totalPages)} />
            </div>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 }}
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <ModeButton
                  active={mode === "compress"}
                  icon={<FileArchive size={14} />}
                  label="Compress"
                  onClick={() => setMode("compress")}
                />
                <ModeButton
                  active={mode === "merge"}
                  icon={<Merge size={14} />}
                  label="Merge"
                  onClick={() => setMode("merge")}
                />
                <ModeButton
                  active={mode === "edit"}
                  icon={<LayoutGrid size={14} />}
                  label="Edit Pages"
                  onClick={() => setMode("edit")}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={removeDuplicates}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <WandSparkles size={14} />
                  Deduplicate
                </button>
                <button
                  type="button"
                  onClick={resetSession}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCw size={14} />
                  Reset
                </button>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`mt-4 rounded-xl border border-dashed p-5 transition ${
                isDragActive ? "border-slate-500 bg-slate-100" : "border-slate-300 bg-slate-50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-900 p-2 text-white">
                    <UploadCloud size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Drag and drop PDF files</p>
                    <p className="text-xs text-slate-600">Maximum {MAX_FILES} files per session</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={open}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Browse Files
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-600">{notice}</p>
            </div>
          </motion.section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Queue</h2>

              <div className="mt-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {files.length ? (
                    files.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-slate-500" />
                              <p className="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatBytes(entry.file.size)}
                              {entry.pageCount !== null ? ` | ${entry.pageCount} pages` : " | scanning pages..."}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <IconButton onClick={() => moveFile(index, -1)} disabled={index === 0}>
                              <ArrowUp size={12} />
                            </IconButton>
                            <IconButton onClick={() => moveFile(index, 1)} disabled={index === files.length - 1}>
                              <ArrowDown size={12} />
                            </IconButton>
                            <IconButton onClick={() => removeFile(entry.id)} danger>
                              <Trash2 size={12} />
                            </IconButton>
                          </div>
                        </div>

                        {isWorking && mode === "compress" && progressMap[entry.id] !== undefined ? (
                          <div className="mt-2">
                            <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                              <span>Compression</span>
                              <span>{progressMap[entry.id]}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200">
                              <motion.div
                                className="h-1.5 rounded-full bg-slate-900"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressMap[entry.id]}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    ))
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500"
                    >
                      No files queued yet.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {mode === "compress" && (
                  <motion.div
                    key="compress-pane"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Compression</h2>
                      <p className="text-xs text-slate-500">Suggested: {PRESET_META[recommendedLevel].label}</p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {(Object.keys(PRESET_META) as CompressionLevel[]).map((level) => {
                        const preset = PRESET_META[level];
                        const active = compressionLevel === level;

                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setCompressionLevel(level)}
                            title={preset.tooltip}
                            className={`group relative rounded-lg border px-3 py-3 text-left transition-all duration-200 ${
                              active
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden w-56 -translate-x-1/2 -translate-y-[108%] rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 shadow-md group-hover:block group-focus-visible:block">
                              {preset.tooltip}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">{preset.label}</p>
                              <span className={`text-lg font-bold ${active ? "text-white" : "text-slate-800"}`}>
                                {preset.targetReduction}%
                              </span>
                            </div>
                            <div className="mt-3 h-1.5 rounded-full bg-slate-200/70">
                              <div
                                className={`h-1.5 rounded-full ${active ? "bg-white" : preset.colorClass}`}
                                style={{ width: `${preset.targetReduction}%` }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCompress()}
                      disabled={!files.length || isWorking}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isWorking ? "Compressing..." : "Run Compression"}
                    </button>

                    {compressionResults.length ? (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <SummaryCard label="Original" value={formatBytes(compressionStats.original)} />
                          <SummaryCard label="Compressed" value={formatBytes(compressionStats.compressed)} />
                          <SummaryCard label="Saved" value={`${compressionStats.savedPct.toFixed(1)}%`} />
                        </div>

                        {compressionResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">{result.name}</p>
                              <p className="text-xs text-slate-500">
                                {formatBytes(result.originalSize)} | {formatBytes(result.compressedSize)}
                              </p>
                            </div>

                            <a
                              href={result.url}
                              download={`compressed_${result.name}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <Download size={12} />
                              Download
                            </a>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => void handleZipDownload()}
                          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Download ZIP
                        </button>
                      </div>
                    ) : null}
                </motion.div>
              )}

              {mode === "merge" && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Merge</h2>
                  <p className="mt-2 text-sm text-slate-600">Queue order determines output page order.</p>

                    <button
                      type="button"
                      onClick={() => void handleMerge()}
                      disabled={!files.length || isWorking}
                      className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isWorking ? "Merging..." : "Merge Files"}
                    </button>

                    {mergeResult ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-medium text-slate-800">{mergeResult.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatBytes(mergeResult.size)}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={mergeResult.url}
                            download={mergeResult.name}
                            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            <Download size={13} />
                            Download
                          </a>
                          <button
                            type="button"
                            onClick={() => window.open(mergeResult.url, "_blank", "noopener,noreferrer")}
                            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    ) : null}
                </div>
              )}

              {mode === "edit" && (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Page Editor</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Select a PDF file to edit. Open a full-page editor to rotate, delete, reorder, and split pages.
                  </p>

                    {files.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {files.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-slate-500" />
                                <p className="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatBytes(entry.file.size)}
                                {entry.pageCount !== null ? ` | ${entry.pageCount} pages` : " | scanning pages..."}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingFile(entry.file)}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                            >
                              <LayoutGrid size={14} />
                              Edit Pages
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No files to edit. Upload PDF files first.</p>
                    )}
                </div>
              )}
            </section>
          </div>
        </div>

        <AnimatePresence>
          {editingFile && (
            <PageEditor file={editingFile} onClose={() => setEditingFile(null)} />
          )}
        </AnimatePresence>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="inline-flex items-center gap-2 text-sm text-slate-600">
                <ShieldCheck size={14} className="text-emerald-600" />
                Files are processed locally and never uploaded.
              </p>
            </div>
            
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <p className="text-sm text-slate-500">
                © 2025 by Aldo. All rights reserved.
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">PDF Zen Studio</span>
                <div className="h-4 w-px bg-slate-300" />
                <a
                  href="https://github.com/aldotobing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 transition hover:text-slate-900"
                  aria-label="GitHub"
                >
                  <Github size={18} />
                </a>
                <a
                  href="https://twitter.com/aldo_tobing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 transition hover:text-slate-900"
                  aria-label="Twitter"
                >
                  <Twitter size={18} />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </motion.main>
    </>
  );
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border p-1.5 transition disabled:opacity-30 ${
        danger
          ? "border-slate-200 text-rose-600 hover:bg-rose-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
