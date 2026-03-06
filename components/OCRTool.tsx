"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { performOCRonPdf } from "@/utils/pdfPageEditor";

interface OCRToolProps {
  file: File | null;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}

export default function OCRTool({ file, onStatus, onProcessing }: OCRToolProps) {
  const [language, setLanguage] = useState<'eng' | 'spa' | 'fra' | 'deu'>('eng');
  const [progress, setProgress] = useState(0);

  const languages = [
    { value: 'eng', label: 'English' },
    { value: 'spa', label: 'Spanish' },
    { value: 'fra', label: 'French' },
    { value: 'deu', label: 'German' },
  ];

  const handleOCR = useCallback(async () => {
    if (!file) {
      onStatus("Please select a PDF file first");
      return;
    }

    onProcessing(true);
    setProgress(0);
    
    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const blob = await performOCRonPdf(file, language);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `searchable_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      
      onStatus("✓ OCR complete! Downloaded searchable PDF");
    } catch (error: any) {
      onStatus(`✗ OCR failed: ${error.message || "Unknown error"}`);
    } finally {
      onProcessing(false);
      setProgress(0);
    }
  }, [file, language, onProcessing, onStatus]);

  if (!file) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-12">
          <Shield size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No PDF Selected</h3>
          <p className="text-slate-400">Select a scanned PDF to make it searchable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Shield className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">What is OCR?</p>
            <p className="text-blue-300/80 leading-relaxed">
              OCR (Optical Character Recognition) analyzes scanned PDFs and adds an invisible text layer,
              making the document searchable and selectable while preserving the original appearance.
            </p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Document Language
          </label>
          <div className="grid grid-cols-2 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setLanguage(lang.value as 'eng' | 'spa' | 'fra' | 'deu')}
                className={`p-3 rounded-lg border text-left transition ${
                  language === lang.value
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${language === lang.value ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  <span className={`text-sm font-medium ${language === lang.value ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {lang.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Processing pages...</span>
              <span className="text-sm font-medium text-emerald-400">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">Processing Time</p>
              <p className="text-amber-300/80">
                OCR processes each page individually. A 10-page document typically takes 1-2 minutes.
                Larger files may take longer.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOCR}
          disabled={progress > 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
        >
          <Shield size={18} />
          {progress > 0 ? "Processing..." : "Make Searchable"}
        </button>
      </div>
    </div>
  );
}
