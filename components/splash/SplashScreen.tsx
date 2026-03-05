"use client";

import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: "easeOut" } }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(148,163,184,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.14),transparent_45%),linear-gradient(160deg,#f8fafc_0%,#e2e8f0_100%)]"
    >
      <div className="relative flex w-full max-w-md flex-col items-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full rounded-3xl border border-white/60 bg-white/70 p-8 shadow-[0_26px_80px_-48px_rgba(15,23,42,0.5)] backdrop-blur-xl"
        >
          <motion.img
            src="/assets/img/pdf.png"
            alt="PDF Zen Studio Logo"
            className="mx-auto h-16 w-16 rounded-2xl bg-white p-2 shadow-sm"
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.25, ease: "easeInOut" }}
          />

          <h2 className="mt-5 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-slate-900">
            PDF Zen Studio
          </h2>
          <p className="mt-2 text-sm text-slate-600">Preparing your secure workspace...</p>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-slate-900"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
