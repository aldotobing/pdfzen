"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  FileText,
  Download,
  Upload,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  protectPdfWithPassword,
  addWatermarkToPdf,
  performOCRonPdf,
  type WatermarkOptions,
} from "@/utils/pdfPageEditor";
import OCRTool from "./OCRTool";

interface SecurityToolsProps {
  file: File;
  onClose: () => void;
}

type SecurityTab = "password" | "watermark" | "redact" | "ocr";

export default function SecurityTools({ file, onClose }: SecurityToolsProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>("password");
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
              <Shield className="text-emerald-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Security Tools</h2>
              <p className="text-sm text-slate-400">{file.name}</p>
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
        <div className="flex border-b border-slate-700 bg-slate-800/50 px-6">
          <TabButton
            active={activeTab === "password"}
            onClick={() => setActiveTab("password")}
            icon={<Lock size={16} />}
            label="Password"
          />
          <TabButton
            active={activeTab === "watermark"}
            onClick={() => setActiveTab("watermark")}
            icon={<FileText size={16} />}
            label="Watermark"
          />
          <TabButton
            active={activeTab === "redact"}
            onClick={() => setActiveTab("redact")}
            icon={<EyeOff size={16} />}
            label="Redact"
          />
          <TabButton
            active={activeTab === "ocr"}
            onClick={() => setActiveTab("ocr")}
            icon={<Shield size={16} />}
            label="OCR"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === "password" && (
                <PasswordProtection
                  key="password"
                  file={file}
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
              {activeTab === "watermark" && (
                <WatermarkTool
                  key="watermark"
                  file={file}
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
              {activeTab === "redact" && (
                <RedactTool
                  key="redact"
                  file={file}
                  onStatus={setStatusMessage}
                  onProcessing={setIsProcessing}
                />
              )}
              {activeTab === "ocr" && (
                <OCRTool
                  key="ocr"
                  file={file}
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
                <p className="text-white font-medium">Processing...</p>
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
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
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

function PasswordProtection({
  file,
  onStatus,
  onProcessing,
}: {
  file: File;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleAddPassword = useCallback(async () => {
    if (!password) {
      onStatus("Please enter a password");
      return;
    }
    if (password !== confirmPassword) {
      onStatus("Passwords do not match");
      return;
    }
    if (password.length < 4) {
      onStatus("Password must be at least 4 characters");
      return;
    }

    onProcessing(true);
    try {
      const blob = await protectPdfWithPassword(file, password);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `protected_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      onStatus("✓ PDF password protected and downloaded successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      onStatus(`✗ ${error.message || "Failed to add password protection"}`);
    } finally {
      onProcessing(false);
    }
  }, [file, password, confirmPassword, onProcessing, onStatus]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        {/* Security Notice */}
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-200">
            <p className="font-medium mb-1">Important Security Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-300/80">
              <li>Store your password safely - it cannot be recovered if lost</li>
              <li>This password will be required to open the PDF</li>
              <li>Uses RC4 128-bit encryption (runs entirely in your browser)</li>
              <li>Compatible with Adobe Reader, Preview, and most PDF viewers</li>
            </ul>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="Enter password (min 4 characters)"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                confirmPassword && password !== confirmPassword
                  ? "border-red-500"
                  : "border-slate-600"
              }`}
              placeholder="Confirm password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Passwords do not match
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleAddPassword}
          disabled={!password || password !== confirmPassword || password.length < 4}
          className="w-full mt-10 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
        >
          <Lock size={18} />
          Add Password & Download
        </button>
      </div>
    </div>
  );
}

function WatermarkTool({
  file,
  onStatus,
  onProcessing,
}: {
  file: File | null;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<WatermarkOptions["position"]>("center");
  const [color, setColor] = useState({ r: 0.5, g: 0.5, b: 0.5 });
  const [useText, setUseText] = useState(true);
  const [useImage, setUseImage] = useState(false);

  const handleImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
      setUseImage(true);
      setUseText(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImageDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    multiple: false,
  });

  const removeImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    setUseImage(false);
  }, [imagePreview]);

  const handleAddWatermark = useCallback(async () => {
    if (!file) {
      onStatus("Please select a PDF file first");
      return;
    }
    if (!useText && !useImage) {
      onStatus("Please enable text or upload an image for watermark");
      return;
    }
    if (useText && !text.trim()) {
      onStatus("Please enter watermark text");
      return;
    }

    onProcessing(true);
    try {
      const blob = await addWatermarkToPdf(file, {
        text: useText ? text : undefined,
        image: useImage ? imageFile || undefined : undefined,
        fontSize,
        opacity: opacity / 100,
        rotation,
        position,
        color,
        scale: 1,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
      onStatus("✓ Watermark added and downloaded successfully");
    } catch (error) {
      onStatus("Failed to add watermark");
    } finally {
      onProcessing(false);
    }
  }, [file, text, imageFile, useText, useImage, fontSize, opacity, rotation, position, color, onProcessing, onStatus]);

  // Cleanup on unmount
  useState(() => () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        {/* Form Fields */}
        <div className="space-y-5">
          {/* Watermark Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Watermark Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setUseText(true); setUseImage(false); }}
                className={`p-4 rounded-lg border text-left transition ${
                  useText
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full ${useText ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  <span className={`font-semibold ${useText ? 'text-emerald-400' : 'text-slate-300'}`}>
                    Text Watermark
                  </span>
                </div>
                <p className="text-xs text-slate-400">Add custom text watermark</p>
              </button>
              <button
                type="button"
                onClick={() => { setUseImage(true); setUseText(false); }}
                className={`p-4 rounded-lg border text-left transition ${
                  useImage
                    ? "bg-emerald-500/10 border-emerald-500"
                    : "bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-4 h-4 rounded-full ${useImage ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  <span className={`font-semibold ${useImage ? 'text-emerald-400' : 'text-slate-300'}`}>
                    Image Watermark
                  </span>
                </div>
                <p className="text-xs text-slate-400">Add logo or branding image</p>
              </button>
            </div>
          </div>

          {useText && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Watermark Text
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="e.g., CONFIDENTIAL, DRAFT, SAMPLE"
              />
            </div>
          )}

          {useImage && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Watermark Image
              </label>
              {!imagePreview ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                    isDragActive
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto text-slate-400 mb-3" size={32} />
                  {isDragActive ? (
                    <p className="text-emerald-400 font-medium">Drop image here...</p>
                  ) : (
                    <>
                      <p className="text-slate-300 font-medium mb-1">
                        Drag & drop image here
                      </p>
                      <p className="text-slate-500 text-sm">
                        PNG or JPEG • Click to browse
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-slate-700/50 border border-slate-600 p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={imagePreview}
                      alt="Watermark preview"
                      className="w-20 h-20 object-contain rounded-lg bg-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {imageFile?.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {imageFile && (imageFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Font Size: <span className="text-emerald-400">{fontSize}px</span>
              </label>
              <input
                type="range"
                min="12"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Opacity: <span className="text-emerald-400">{opacity}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rotation: <span className="text-emerald-400">{rotation}°</span>
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                <ColorButton
                  color="rgb(128, 128, 128)"
                  selected={color.r === 0.5}
                  onClick={() => setColor({ r: 0.5, g: 0.5, b: 0.5 })}
                />
                <ColorButton
                  color="rgb(255, 0, 0)"
                  selected={color.r === 1 && color.g === 0}
                  onClick={() => setColor({ r: 1, g: 0, b: 0 })}
                />
                <ColorButton
                  color="rgb(0, 0, 255)"
                  selected={color.b === 1 && color.r === 0}
                  onClick={() => setColor({ r: 0, g: 0, b: 1 })}
                />
                <ColorButton
                  color="rgb(0, 0, 0)"
                  selected={color.r === 0 && color.g === 0}
                  onClick={() => setColor({ r: 0, g: 0, b: 0 })}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            <PositionButton
              label="Top Left"
              active={position === "top-left"}
              onClick={() => setPosition("top-left")}
            />
            <PositionButton
              label="Top"
              active={position === "center" && rotation === 0}
              onClick={() => { setPosition("center"); setRotation(0); }}
            />
            <PositionButton
              label="Top Right"
              active={position === "top-right"}
              onClick={() => setPosition("top-right")}
            />
            <PositionButton
              label="Left"
              active={false}
              onClick={() => {}}
              disabled
            />
            <PositionButton
              label="Center"
              active={position === "center"}
              onClick={() => setPosition("center")}
            />
            <PositionButton
              label="Right"
              active={false}
              onClick={() => {}}
              disabled
            />
            <PositionButton
              label="Bottom Left"
              active={position === "bottom-left"}
              onClick={() => setPosition("bottom-left")}
            />
            <PositionButton
              label="Bottom"
              active={false}
              onClick={() => {}}
              disabled
            />
            <PositionButton
              label="Bottom Right"
              active={position === "bottom-right"}
              onClick={() => setPosition("bottom-right")}
            />
          </div>
          <div className="mt-3">
            <PositionButton
              label="Tile (Repeat Across Page)"
              active={position === "tile"}
              onClick={() => setPosition("tile")}
            />
          </div>
        </div>

        <button
          onClick={handleAddWatermark}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
        >
          <FileText size={18} />
          Add Watermark & Download
        </button>
      </div>
    </div>
  );
}

function ColorButton({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-lg border-2 transition ${
        selected ? "border-emerald-500" : "border-slate-600"
      }`}
      style={{ backgroundColor: color }}
    >
      {selected && <Check size={16} className="mx-auto text-white drop-shadow" />}
    </button>
  );
}

function PositionButton({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
        active
          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
          : disabled
          ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
          : "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function RedactTool({
  file,
  onStatus,
  onProcessing,
}: {
  file: File;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [redactions, setRedactions] = useState<Array<{ pageIndex: number; x: number; y: number; width: number; height: number }>>([]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
          <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-red-200">
            <p className="font-medium mb-1">⚠️ Permanent Action</p>
            <p>Redaction permanently removes content from the PDF. This action cannot be undone. Make sure to review the document carefully before downloading.</p>
          </div>
        </div>

        <div className="text-center py-12">
          <EyeOff size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Interactive Redaction</h3>
          <p className="text-slate-400 mb-6">
            Select areas on the PDF to permanently redact (black out) sensitive content.
          </p>
          <button
            onClick={() => onStatus("Redaction tool - Select areas on the PDF to black out content. Feature coming soon!")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
          >
            <EyeOff size={18} />
            Open Redaction Editor
          </button>
        </div>
      </div>
    </div>
  );
}
