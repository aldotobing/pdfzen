"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

const FileUploader = dynamic(() => import("../components/FileUploader"), {
  ssr: false,
});

import CompressionOptions from "../components/CompressionOptions";
import CompressionProgress from "../components/CompressionProgress";
import { compressPDF } from "../utils/pdfCompressor";
import { mergePDFs } from "../utils/pdfMerger";
import type { CompressedFile, CompressionLevel } from "../types";
import DownloadSection from "../components/DownloadSection";
import { FiPlus } from "react-icons/fi";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<CompressedFile[]>([]);
  const [mergedFile, setMergedFile] = useState<Blob | null>(null);
  const [mergeFileName, setMergeFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number[]>([]);
  const [currentMode, setCurrentMode] = useState<"compress" | "merge">(
    "compress"
  );

  const compressionPresets = {
    low: 20,
    medium: 50,
    high: 80,
  };

  const [compressionLevel, setCompressionLevel] = useState<number>(
    compressionPresets.medium
  );

  const handleFileUpload = (uploadedFiles: File[]) => {
    setFiles((prevFiles) => {
      const newFiles = [...prevFiles, ...uploadedFiles].slice(0, 5);
      setProgress(new Array(newFiles.length).fill(0));
      return newFiles;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleCompress = async () => {
    setIsProcessing(true);
    const compressed: CompressedFile[] = [];
    const levelKey =
      (Object.entries(compressionPresets).find(
        ([, value]) => value === compressionLevel
      )?.[0] as CompressionLevel) || "medium";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await compressPDF(file, levelKey, (p) => {
          setProgress((prev) => {
            const newProgress = [...prev];
            newProgress[i] = p;
            return newProgress;
          });
        });
        compressed.push({
          originalFile: file,
          compressedSize: result.size,
          downloadUrl: URL.createObjectURL(result),
        });
      } catch (error) {
        console.error(`Error compressing ${file.name}:`, error);
      }
    }
    setCompressedFiles(compressed);
    setIsProcessing(false);
  };

  const handleMerge = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await mergePDFs(files);
      setMergedFile(result);
      const uniqueName =
        "merged_" + new Date().toISOString().replace(/[:.-]/g, "") + ".pdf";
      setMergeFileName(uniqueName);
    } catch (error) {
      console.error("Error merging PDFs:", error);
    }
    setIsProcessing(false);
  };

  // Reset all states without reloading the page
  const handleReset = () => {
    // Clean up object URLs for compressed files
    compressedFiles.forEach((file) => URL.revokeObjectURL(file.downloadUrl));

    // Clean up merged file URL if needed
    if (mergedFile) {
      const mergedFileUrl = URL.createObjectURL(mergedFile);
      URL.revokeObjectURL(mergedFileUrl);
    }

    // Then reset the states
    setFiles([]);
    setCompressedFiles([]);
    setMergedFile(null);
    setMergeFileName("");
    setProgress([]);
    setIsProcessing(false);
  };

  const actionButtonClasses =
    "mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 to-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-center text-gray-900 mb-4 anti-aliasing"
        >
          PDF Utility
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm sm:text-base md:text-lg text-center text-gray-700 mb-6 anti-aliasing"
        >
          Choose between compressing or merging your PDF files for efficient
          management.
          <br />
          <span className="text-gray-600 font-medium anti-aliasing">
            <b>Compress</b> to reduce file sizes for easier storage and sharing,
            or <b>merge</b> multiple PDFs into one for seamless organization.
          </span>
        </motion.p>

        {/* Toggle Switch */}
        <div className="relative w-64 h-12 mx-auto bg-gray-100 rounded-full flex items-center overflow-hidden shadow-md mb-8">
          <motion.div
            className="absolute top-1 left-1 h-10 w-[48%] bg-blue-600 rounded-full"
            animate={{ x: currentMode === "compress" ? 0 : "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          <button
            onClick={() => setCurrentMode("compress")}
            className={`relative z-10 flex-1 text-center font-bold ${
              currentMode === "compress" ? "text-white" : "text-gray-700"
            }`}
          >
            Compress
          </button>
          <button
            onClick={() => setCurrentMode("merge")}
            className={`relative z-10 flex-1 text-center font-bold ${
              currentMode === "merge" ? "text-white" : "text-gray-700"
            }`}
          >
            Merge
          </button>
        </div>

        {/* File Uploader */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMode + "-uploader"}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <FileUploader
              onFileUpload={handleFileUpload}
              maxFiles={5}
              files={files}
              onRemoveFile={handleRemoveFile}
            />
          </motion.div>
        </AnimatePresence>

        {/* Mode-specific Content */}
        <AnimatePresence mode="wait">
          {currentMode === "compress" && (
            <>
              {/* Container untuk opsi compress */}
              <motion.div
                key="compress-options"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-lg mt-6 p-8 sm:p-10"
              >
                <CompressionOptions
                  compressionLevel={compressionLevel}
                  setCompressionLevel={setCompressionLevel}
                />
              </motion.div>

              {/* Container untuk tombol compress dan progress */}
              <motion.div
                key="compress-action"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
                className="mt-4 flex flex-col items-center space-y-4"
              >
                <motion.button
                  onClick={handleCompress}
                  disabled={files.length === 0 || isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={actionButtonClasses}
                >
                  {isProcessing ? "Compressing..." : "Compress PDFs"}
                </motion.button>
                {isProcessing && (
                  <CompressionProgress files={files} progress={progress} />
                )}
                {compressedFiles.length > 0 && (
                  <DownloadSection
                    compressedFiles={compressedFiles}
                    onReset={handleReset}
                  />
                )}
              </motion.div>
            </>
          )}

          {currentMode === "merge" && (
            <>
              {/* Container tombol tanpa card styling */}
              <motion.div
                key="merge-button"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="mt-6 flex justify-center"
              >
                <motion.button
                  onClick={handleMerge}
                  disabled={files.length === 0 || isProcessing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={actionButtonClasses}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white border-opacity-75"></span>
                      <span>Merging...</span>
                    </div>
                  ) : (
                    "Merge PDFs"
                  )}
                </motion.button>
              </motion.div>

              {/* Container card untuk mergedFile */}
              {mergedFile && (
                <motion.div
                  key="merge-card"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                  className="mt-8 bg-white rounded-2xl shadow-lg p-8 sm:p-10"
                >
                  <div className="bg-gradient-to-r from-blue-100 to-green-100 p-8 rounded-xl shadow-md text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">
                      🎉 Your merged PDF is ready!
                    </h3>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                      <a
                        href={URL.createObjectURL(mergedFile)}
                        download={mergeFileName}
                        className="bg-green-600 text-white py-3 px-8 rounded-lg font-bold shadow-lg hover:bg-green-700 transition-all"
                      >
                        Download PDF
                      </a>
                      <button
                        onClick={() =>
                          window.open(URL.createObjectURL(mergedFile), "_blank")
                        }
                        className="bg-blue-600 text-white py-3 px-8 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all"
                      >
                        Preview PDF
                      </button>
                      <motion.button
                        onClick={handleReset}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gray-800 text-white w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 rounded-lg font-bold shadow-lg hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center"
                      >
                        <FiPlus className="text-xl" />
                        <span className="hidden md:inline ml-2">
                          New Session
                        </span>
                      </motion.button>
                    </div>
                    <motion.img
                      src="/assets/img/tuzki.gif"
                      alt="Tuzki Celebration"
                      className="mx-auto mt-8 w-32"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </motion.div>
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex flex-col items-center space-y-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center text-sm text-gray-500 font-medium"
          >
            🔒Your files are processed locally and never leave your device,
            ensuring maximum privacy and security.
          </motion.p>
          <p className="text-center text-sm text-gray-600 font-medium">
            Built with ❤️ by{" "}
            <span className="font-semibold text-blue-500">Aldo Tobing</span>
          </p>
          <div className="flex space-x-4">
            <a
              href="https://github.com/aldotobing"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition duration-300"
            >
              <img
                src="/assets/img/github-mark.png"
                alt="GitHub"
                className="h-5 w-5"
                loading="lazy"
              />
            </a>
            <a
              href="https://twitter.com/aldo_tobing"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition duration-300"
            >
              <img
                src="/assets/img/x.png"
                alt="Twitter"
                className="h-4 w-4"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
