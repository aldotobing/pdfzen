"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Image,
  FileImage,
  Download,
  Upload,
  X,
  Shield,
  AlertTriangle,
  Check,
  Zip,
  File,
  Repeat,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  convertPdfToImages,
  convertImagesToPdf,
} from "@/utils/pdfPageEditor";

interface ConvertToolsProps {
  file: File | null;
  onClose: () => void;
}

type ConvertTab = "pdf-to-images" | "images-to-pdf" | "office-to-pdf";

export default function ConvertTools({ file, onClose }: ConvertToolsProps) {
  const [activeTab, setActiveTab] = useState<ConvertTab>("pdf-to-images");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/95 z-50 overflow-auto"
    >
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Repeat className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Convert Files</h2>
              <p className="text-sm text-slate-400">
                {activeTab === "pdf-to-images" && "Export PDF pages as images"}
                {activeTab === "images-to-pdf" && "Combine images into a PDF"}
                {activeTab === "office-to-pdf" && "Convert Office documents to PDF"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-300"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 bg-slate-800/50 px-6 overflow-x-auto">
          <TabButton
            active={activeTab === "pdf-to-images"}
            onClick={() => setActiveTab("pdf-to-images")}
            icon={<Image size={16} />}
            label="PDF to Images"
          />
          <TabButton
            active={activeTab === "images-to-pdf"}
            onClick={() => setActiveTab("images-to-pdf")}
            icon={<FileText size={16} />}
            label="Images to PDF"
          />
          <TabButton
            active={activeTab === "office-to-pdf"}
            onClick={() => setActiveTab("office-to-pdf")}
            icon={<File size={16} />}
            label="Office to PDF"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === "pdf-to-images" && (
                <PdfToImages
                  key="pdf-to-images"
                  file={file}
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
              {activeTab === "images-to-pdf" && (
                <ImagesToPdf
                  key="images-to-pdf"
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
              {activeTab === "office-to-pdf" && (
                <OfficeToPdf
                  key="office-to-pdf"
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Bar */}
        {statusMessage && (
          <div className="border-t border-slate-700 bg-slate-800 px-6 py-3">
            <p className="text-center text-sm text-slate-300">{statusMessage}</p>
          </div>
        )}

        {/* Processing Overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50"
            >
              <div className="bg-slate-800 rounded-xl p-6 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Converting...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active
          ? "border-emerald-500 text-emerald-400"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function PdfToImages({
  file,
  onStatus,
  onProcessing,
}: {
  file: File | null;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(2);

  const handleConvert = useCallback(async () => {
    if (!file) {
      onStatus("Please upload a PDF file first");
      return;
    }

    onProcessing(true);
    try {
      const results = await convertPdfToImages(file, format, quality / 100, scale);
      
      if (results.length === 1) {
        // Single page - download directly
        const a = document.createElement("a");
        a.href = results[0].dataUrl;
        a.download = results[0].name;
        a.click();
        onStatus(`✓ Converted to ${format.toUpperCase()}`);
      } else {
        // Multiple pages - create ZIP
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        results.forEach((result) => {
          const base64 = result.dataUrl.split(',')[1];
          zip.file(result.name, base64, { base64: true });
        });
        
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.name.replace(/\.pdf$/i, "")}_images.zip`;
        a.click();
        URL.revokeObjectURL(url);
        onStatus(`✓ Converted ${results.length} pages to ${format.toUpperCase()}`);
      }
    } catch (error) {
      onStatus("✗ Conversion failed");
    } finally {
      onProcessing(false);
    }
  }, [file, format, quality, scale, onProcessing, onStatus]);

  if (!file) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-12">
          <Repeat size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No PDF Selected</h3>
          <p className="text-slate-400">Upload a PDF file to convert it to images</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Output Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <FormatButton
                format="png"
                selected={format === 'png'}
                onClick={() => setFormat('png')}
                label="PNG"
                description="Lossless, larger files"
              />
              <FormatButton
                format="jpeg"
                selected={format === 'jpeg'}
                onClick={() => setFormat('jpeg')}
                label="JPEG"
                description="Smaller files, adjustable quality"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Quality: {quality}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              disabled={format === 'png'}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Resolution: {scale * 72} DPI
            </label>
            <input
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>72 DPI</span>
              <span>144 DPI</span>
              <span>216 DPI</span>
              <span>288 DPI</span>
            </div>
          </div>

          <button
            onClick={handleConvert}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
          >
            <Download size={18} />
            Convert to {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormatButton({
  format,
  selected,
  onClick,
  label,
  description,
}: {
  format: 'png' | 'jpeg';
  selected: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border text-left transition ${
        selected
          ? "bg-emerald-500/10 border-emerald-500"
          : "bg-slate-700/50 border-slate-600 hover:bg-slate-700"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-3 h-3 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-500'}`} />
        <span className={`font-semibold ${selected ? 'text-emerald-400' : 'text-slate-300'}`}>
          {label}
        </span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  );
}

function ImagesToPdf({
  onStatus,
  onProcessing,
}: {
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [images, setImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    multiple: true,
  });

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (images.length === 0) {
      onStatus("Please upload images first");
      return;
    }

    onProcessing(true);
    try {
      const imageFiles = images.map(img => img.file);
      const blob = await convertImagesToPdf(imageFiles);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted_images.pdf";
      a.click();
      URL.revokeObjectURL(url);
      onStatus(`✓ Converted ${images.length} images to PDF`);
      setImages([]);
    } catch (error: any) {
      onStatus(`✗ ${error.message || "Conversion failed"}`);
    } finally {
      onProcessing(false);
    }
  }, [images, onProcessing, onStatus]);

  // Cleanup on unmount
  useState(() => () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Supported Formats:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                <li>PNG - Portable Network Graphics</li>
                <li>JPEG/JPG - Joint Photographic Experts Group</li>
                <li>GIF - Graphics Interchange Format</li>
                <li>WebP - Web Picture format</li>
              </ul>
            </div>
          </div>

          {/* Dropzone with Previews */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]"
                : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/50"
            }`}
          >
            <input {...getInputProps()} />
            
            {images.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-10"
              >
                <Upload className="mx-auto text-slate-400 mb-4" size={40} />
                {isDragActive ? (
                  <motion.p
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-emerald-400 font-semibold text-lg"
                  >
                    Drop images here...
                  </motion.p>
                ) : (
                  <>
                    <p className="text-slate-200 font-semibold text-base mb-2">
                      Drag & drop images here
                    </p>
                    <p className="text-slate-500 text-sm">
                      PNG, JPEG, GIF, WebP • Click to browse
                    </p>
                  </>
                )}
              </motion.div>
            ) : (
              <div className="py-2">
                {isDragActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-emerald-400 font-medium mb-4 text-sm"
                  >
                    ↓ Drop to add more images...
                  </motion.div>
                )}
                
                {/* Header with count and clear button */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <p className="text-sm font-medium text-slate-300">
                    <span className="text-emerald-400">{images.length}</span> image{images.length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImages([]);
                    }}
                    className="text-xs font-medium text-red-400 hover:text-red-300 transition flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-red-500/10"
                  >
                    <X size={14} />
                    Clear all
                  </button>
                </div>
                
                {/* Full-width preview grid with + add button */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  <AnimatePresence mode="popLayout">
                    {images.map((img) => (
                      <motion.div
                        key={img.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-slate-700 shadow-sm"
                      >
                        <img
                          src={img.preview}
                          alt={img.file.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 bg-red-500/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 hover:scale-110"
                        >
                          <X size={14} className="text-white" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 via-black/50 to-transparent">
                          <p className="text-[10px] font-medium text-white truncate text-center">
                            {img.file.name.slice(0, 10)}...
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Add more button */}
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="relative aspect-square rounded-xl overflow-hidden bg-slate-700/50 border-2 border-dashed border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer flex items-center justify-center group"
                    >
                      <div className="text-slate-400 group-hover:text-emerald-400 transition-colors">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-500 group-hover:text-emerald-400 whitespace-nowrap">
                        Add more
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleConvert}
            disabled={images.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
          >
            <FileText size={18} />
            Convert to PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function OfficeToPdf({
  onStatus,
  onProcessing,
}: {
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-12">
          <File size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Office to PDF</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Convert Word, Excel, and PowerPoint files to PDF format.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm">
            <AlertTriangle size={16} />
            Coming Soon
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm font-medium text-slate-300">Word</p>
            <p className="text-xs text-slate-500">.doc, .docx</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-sm font-medium text-slate-300">Excel</p>
            <p className="text-xs text-slate-500">.xls, .xlsx</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📽️</span>
            </div>
            <p className="text-sm font-medium text-slate-300">PowerPoint</p>
            <p className="text-xs text-slate-500">.ppt, .pptx</p>
          </div>
        </div>
      </div>
    </div>
  );
}
