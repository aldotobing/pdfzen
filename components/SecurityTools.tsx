"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  FileText,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import {
  addWatermarkToPdf,
  type WatermarkOptions,
} from "@/utils/pdfPageEditor";

interface SecurityToolsProps {
  file: File;
  onClose: () => void;
}

type SecurityTab = "password" | "watermark" | "redact";

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
            label="Password Protection"
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
            label="Redact Content"
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
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="text-center py-12">
          <Lock size={48} className="mx-auto text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Password Protection</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Add or remove passwords from PDFs. This feature requires additional processing and is coming soon.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm">
            <AlertTriangle size={16} />
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

function WatermarkTool({
  file,
  onStatus,
  onProcessing,
}: {
  file: File;
  onStatus: (msg: string) => void;
  onProcessing: (loading: boolean) => void;
}) {
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<WatermarkOptions["position"]>("center");
  const [color, setColor] = useState({ r: 0.5, g: 0.5, b: 0.5 });

  const handleAddWatermark = useCallback(async () => {
    if (!text.trim()) {
      onStatus("Please enter watermark text");
      return;
    }

    onProcessing(true);
    try {
      const blob = await addWatermarkToPdf(file, {
        text,
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
      onStatus("Watermark added and downloaded successfully");
    } catch (error) {
      onStatus("Failed to add watermark");
    } finally {
      onProcessing(false);
    }
  }, [file, text, fontSize, opacity, rotation, position, color, onProcessing, onStatus]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Watermark Text
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g., CONFIDENTIAL, DRAFT, SAMPLE"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="120"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Opacity: {opacity}%
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Rotation: {rotation}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full"
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
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
