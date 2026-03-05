"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  RotateCw,
  Trash2,
  Scissors,
  Download,
  Grid3X3,
  List,
  Check,
  X,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  FileDown,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

import { PageData, PdfWithPages } from "@/types";
import {
  rotatePdfPages,
  deletePdfPages,
  reorderPdfPages,
  splitPdfIntoIndividualPages,
  splitPdfPages,
} from "@/utils/pdfPageEditor";

interface PageEditorProps {
  file: File;
  onClose: () => void;
}

export default function PageEditor({ file, onClose }: PageEditorProps) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState<PageData[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize pages from PDF
  useEffect(() => {
    let isMounted = true;

    const loadPages = async () => {
      try {
        setIsLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();

        const initialPages: PageData[] = Array.from({ length: totalPages }, (_, i) => ({
          id: `page-${i}-${Date.now()}`,
          pageIndex: i,
          rotation: 0,
          selected: false,
        }));

        if (isMounted) {
          setPages(initialPages);
          setHistory([initialPages]);
          setHistoryIndex(0);
          setStatusMessage(`Loaded ${totalPages} pages from ${file.name}`);
        }
      } catch (error) {
        console.error("Failed to load PDF:", error);
        if (isMounted) {
          setStatusMessage("Failed to load PDF");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPages();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // Generate thumbnails when pages are loaded
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;

    if (pages.length > 0 && !isLoading) {
      const loadThumbnails = async () => {
        const thumbnails: (string | undefined)[] = [];
        
        for (let i = 0; i < Math.min(pages.length, 20); i++) {
          if (cancelled) break;
          
          try {
            const thumbnailUrl = await generateThumbnail(file, i);
            thumbnails[i] = thumbnailUrl || undefined;
          } catch (error) {
            console.error(`Failed to load thumbnail for page ${i}:`, error);
            thumbnails[i] = undefined;
          }
        }

        if (isMounted && !cancelled) {
          setPages((prev) =>
            prev.map((page, i) =>
              thumbnails[i] ? { ...page, thumbnailUrl: thumbnails[i] } : page
            )
          );
        }
      };
      loadThumbnails();
    }

    return () => {
      isMounted = false;
      cancelled = true;
    };
  }, [isLoading, file, pages.length]);

  const saveToHistory = useCallback((newPages: PageData[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newPages);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setPages(history[historyIndex - 1]);
      setStatusMessage("Undo");
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setPages(history[historyIndex + 1]);
      setStatusMessage("Redo");
    }
  }, [history, historyIndex]);

  const handleSelectPage = useCallback((index: number, event?: React.MouseEvent) => {
    setSelectedPages((prev) => {
      const newSelection = new Set(prev);
      
      // Range selection with Shift
      if (event?.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSelection.add(i);
        }
      } 
      // Toggle selection with Ctrl/Cmd
      else if (event?.ctrlKey || event?.metaKey) {
        if (newSelection.has(index)) {
          newSelection.delete(index);
        } else {
          newSelection.add(index);
        }
      } 
      // Single selection
      else {
        newSelection.clear();
        newSelection.add(index);
      }
      
      setLastSelectedIndex(index);
      return newSelection;
    });
  }, [lastSelectedIndex]);

  const handleRotateSelected = useCallback((degrees: number) => {
    if (selectedPages.size === 0) return;

    const newPages = pages.map((page) => {
      if (selectedPages.has(page.pageIndex)) {
        const newRotation = ((page.rotation + degrees) % 360 + 360) % 360;
        return { ...page, rotation: newRotation };
      }
      return page;
    });

    setPages(newPages);
    saveToHistory(newPages);
    setStatusMessage(`Rotated ${selectedPages.size} page(s) by ${degrees}°`);
  }, [pages, selectedPages, saveToHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedPages.size === 0) return;
    if (pages.length - selectedPages.size === 0) {
      setStatusMessage("Cannot delete all pages");
      return;
    }

    // Get the array indices (positions) to delete, not the pageIndex values
    const positionsToDelete = Array.from(selectedPages);
    
    // Filter out pages at those positions, but KEEP their original pageIndex
    const newPages = pages
      .filter((_, position) => !positionsToDelete.includes(position))
      .map((page, newIndex) => ({ 
        ...page, 
        // Don't change pageIndex - it must always refer to the original PDF
        // Only update the position in the array for display order
      }));

    setPages(newPages);
    saveToHistory(newPages);
    setSelectedPages(new Set());
    setStatusMessage(`Deleted ${positionsToDelete.length} page(s)`);
  }, [pages, selectedPages, saveToHistory]);

  const handleReorder = useCallback((newPageOrder: PageData[]) => {
    // Preserve original pageIndex values - only the array order changes
    // pageIndex must always refer to the original PDF page
    const reorderedPages = newPageOrder.map((page) => ({
      ...page,
    }));
    setPages(reorderedPages);
    saveToHistory(reorderedPages);
    setStatusMessage("Pages reordered");
  }, [saveToHistory]);

  const handleSplitSelected = useCallback(async () => {
    if (selectedPages.size === 0) return;

    setIsProcessing(true);
    try {
      const indices = Array.from(selectedPages).sort((a, b) => a - b);
      const blob = await splitPdfPages(file, indices);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}_selected.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Split ${indices.length} page(s) into new PDF`);
    } catch (error) {
      console.error("Split failed:", error);
      setStatusMessage("Failed to split pages");
    } finally {
      setIsProcessing(false);
    }
  }, [file, selectedPages]);

  const handleSplitAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      const results = await splitPdfIntoIndividualPages(file);
      
      // Create ZIP with all pages
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      results.forEach((result) => {
        zip.file(result.name, result.blob);
      });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}_split.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatusMessage(`Split into ${results.length} individual PDFs`);
    } catch (error) {
      console.error("Split all failed:", error);
      setStatusMessage("Failed to split all pages");
    } finally {
      setIsProcessing(false);
    }
  }, [file]);

  const handleSave = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Apply rotations
      const rotations = new Map<number, number>();
      pages.forEach((page) => {
        if (page.rotation !== 0) {
          rotations.set(page.pageIndex, page.rotation);
        }
      });

      // Get current order (the pages array already reflects deletions and reordering)
      // The pageIndex values tell us which original pages to include and in what order
      const pageOrder = pages.map((p) => p.pageIndex);

      let resultBlob: Blob;
      let workingFile = file;

      // Step 1: Apply rotations to the original file
      if (rotations.size > 0) {
        resultBlob = await rotatePdfPages(file, rotations);
        workingFile = new File([resultBlob], file.name, { type: "application/pdf" });
      }

      // Step 2: Extract and reorder pages (this also handles deletions by only including kept pages)
      if (pageOrder.length > 0) {
        resultBlob = await reorderPdfPages(workingFile, pageOrder);
      } else {
        resultBlob = workingFile;
      }

      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage("Saved edited PDF");
    } catch (error) {
      console.error("Save failed:", error);
      setStatusMessage("Failed to save changes");
    } finally {
      setIsProcessing(false);
    }
  }, [file, pages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        handleRotateSelected(90);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
      }

      if (e.key === "Escape") {
        setSelectedPages(new Set());
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedPages(new Set(pages.map((_, i) => i)));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, handleRotateSelected, handleDeleteSelected, handleSave, pages]);

  const selectedCount = selectedPages.size;
  const canDelete = pages.length - selectedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/95 z-50 overflow-hidden"
    >
      <div className="h-full flex flex-col" ref={containerRef}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">
              Page Editor
            </h2>
            <span className="text-sm text-slate-400">
              {file.name} • {pages.length} pages
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={18} />
            </button>
            <div className="w-px h-6 bg-slate-600 mx-2" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-300"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={() => handleRotateSelected(90)}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RotateCw size={16} />
              Rotate
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedCount === 0 || !canDelete}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <button
              onClick={handleSplitSelected}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Scissors size={16} />
              Split Selected
            </button>
            <button
              onClick={handleSplitAll}
              disabled={pages.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <FileDown size={16} />
              Split All
            </button>
          </div>

          <div className="flex items-center gap-1 mr-4">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-slate-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg ${viewMode === "list" ? "bg-slate-600 text-white" : "text-slate-400 hover:bg-slate-700"}`}
            >
              <List size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-slate-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="flex-1" />

          <button
            onClick={handleSave}
            disabled={isProcessing || pages.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download size={16} />
            Save PDF
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-slate-700 bg-slate-800/30 text-xs text-slate-400">
          <span>{statusMessage}</span>
          <span>
            {selectedCount > 0 ? `${selectedCount} selected` : "Click to select • Shift+Click for range • Ctrl+Click for multiple"}
          </span>
        </div>

        {/* Page Grid */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400">Loading pages...</div>
            </div>
          ) : viewMode === "grid" ? (
            <Reorder.Group
              axis="y"
              values={pages}
              onReorder={handleReorder}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {pages.map((page, index) => (
                <PageThumbnail
                  key={page.id}
                  page={page}
                  index={index}
                  isSelected={selectedPages.has(index)}
                  onSelect={handleSelectPage}
                  viewMode="grid"
                />
              ))}
            </Reorder.Group>
          ) : (
            <Reorder.Group
              axis="y"
              values={pages}
              onReorder={handleReorder}
              className="space-y-2"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {pages.map((page, index) => (
                <PageThumbnail
                  key={page.id}
                  page={page}
                  index={index}
                  isSelected={selectedPages.has(index)}
                  onSelect={handleSelectPage}
                  viewMode="list"
                />
              ))}
            </Reorder.Group>
          )}
        </div>

        {/* Processing Overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-50"
            >
              <div className="bg-slate-800 rounded-xl p-6 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Processing...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface PageThumbnailProps {
  page: PageData;
  index: number;
  isSelected: boolean;
  onSelect: (index: number, event?: React.MouseEvent) => void;
  viewMode: "grid" | "list";
}

function PageThumbnail({ page, index, isSelected, onSelect, viewMode }: PageThumbnailProps) {
  const isDragging = false;

  if (viewMode === "list") {
    return (
      <Reorder.Item
        value={page}
        id={page.id}
        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all ${
          isSelected
            ? "bg-emerald-900/30 border-emerald-500"
            : "bg-slate-800 border-slate-700 hover:border-slate-600"
        }`}
        onMouseDown={(e: React.MouseEvent) => onSelect(index, e)}
      >
        <div className="w-12 h-16 bg-slate-700 rounded flex items-center justify-center flex-shrink-0">
          {page.thumbnailUrl ? (
            <img
              src={page.thumbnailUrl}
              alt={`Page ${index + 1}`}
              className="w-full h-full object-cover rounded"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          ) : (
            <span className="text-slate-500 text-xs">{index + 1}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">Page {index + 1}</p>
          <p className="text-slate-400 text-sm">
            {page.rotation !== 0 ? `${page.rotation}° rotation` : "No rotation"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">:::</span>
        </div>
      </Reorder.Item>
    );
  }

  return (
    <Reorder.Item
      value={page}
      id={page.id}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/30"
          : "border-slate-700 hover:border-slate-600"
      } bg-slate-800`}
      onMouseDown={(e: React.MouseEvent) => onSelect(index, e)}
    >
      <div
        className="aspect-[3/4] relative"
        style={{ transform: `rotate(${page.rotation}deg)` }}
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-700">
            <span className="text-slate-500 text-2xl font-medium">{index + 1}</span>
          </div>
        )}
      </div>

      {/* Page number overlay */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 rounded text-xs text-white">
        {index + 1}
      </div>

      {/* Rotation indicator */}
      {page.rotation !== 0 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 rounded text-xs text-white">
          {page.rotation}°
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
      )}

      {/* Drag handle */}
      <div className="absolute bottom-2 left-2 text-slate-500 text-xs opacity-0 hover:opacity-100 transition-opacity">
        ⋮⋮
      </div>
    </Reorder.Item>
  );
}

// Helper function to generate thumbnails
async function generateThumbnail(file: File, pageIndex: number): Promise<string> {
  try {
    // Load PDF.js from CDN (UMD build that exposes global)
    if (!(window as any).pdfjsLib) {
      await loadPDFJSFromCDN();
    }
    
    const pdfjsLib = (window as any).pdfjsLib;
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const pdfPage = await pdfDoc.getPage(pageIndex + 1);

    const viewport = pdfPage.getViewport({ scale: 0.3 });
    const canvas = document.createElement("canvas");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: canvas.getContext("2d")!,
      viewport: viewport,
    };
    
    await pdfPage.render(renderContext).promise;
    
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (error) {
    console.error(`Failed to generate thumbnail for page ${pageIndex}:`, error);
    return "";
  }
}

// Load PDF.js from CDN (UMD build)
let pdfjsLoadingPromise: Promise<void> | null = null;
async function loadPDFJSFromCDN(): Promise<void> {
  if ((window as any).pdfjsLib) {
    return;
  }
  
  if (pdfjsLoadingPromise) {
    return pdfjsLoadingPromise;
  }
  
  pdfjsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      } else {
        reject(new Error("PDF.js did not expose pdfjsLib"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
  
  return pdfjsLoadingPromise;
}
