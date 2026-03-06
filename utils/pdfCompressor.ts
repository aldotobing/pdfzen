import { PDFDocument } from "pdf-lib";
import type { CompressionLevel } from "../types";

export async function compressPDF(
  file: File,
  compressionLevel: CompressionLevel,
  onProgress: (progress: number) => void
): Promise<Blob> {
  // Load PDF.js for rendering pages
  const pdfjsLib = await loadPDFJSFromCDN();
  
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  
  // Create new PDF
  const newPdf = await PDFDocument.create();
  
  // Compression settings - scale determines image resolution
  const settings = {
    low: { scale: 1.0, quality: 0.85 },      // Archive - full resolution, light compression
    medium: { scale: 0.85, quality: 0.7 },   // Balanced - slight downsample
    high: { scale: 0.7, quality: 0.55 },     // Web - moderate compression
  };
  
  const { scale, quality } = settings[compressionLevel];
  
  for (let i = 0; i < totalPages; i++) {
    const page = await pdfDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale });
    
    // Render page to canvas
    const canvas = document.createElement("canvas");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const context = canvas.getContext("2d");
    if (context) {
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Convert to compressed JPEG
      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
      
      // Embed image in new PDF
      const jpegImage = await newPdf.embedJpg(new Uint8Array(jpegBytes));
      const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
      
      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    }
    
    onProgress(Math.round(((i + 1) / totalPages) * 100));
  }
  
  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Smart compression - automatically adjusts quality to meet target file size
 */
export async function compressPDFToTargetSize(
  file: File,
  targetSizeBytes: number,
  compressionLevel: CompressionLevel,
  onProgress: (progress: number) => void
): Promise<Blob> {
  const pdfjsLib = await loadPDFJSFromCDN();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const originalSize = arrayBuffer.byteLength;
  
  // Calculate compression ratio needed
  const targetRatio = targetSizeBytes / originalSize;
  
  // Start with estimated settings based on target ratio
  let scale: number;
  let quality: number;
  
  if (targetRatio > 0.8) {
    // Minimal compression needed
    scale = 1.0;
    quality = 0.85;
  } else if (targetRatio > 0.5) {
    // Moderate compression
    scale = 0.85;
    quality = 0.7;
  } else if (targetRatio > 0.3) {
    // Strong compression
    scale = 0.7;
    quality = 0.5;
  } else if (targetRatio > 0.15) {
    // Very strong compression
    scale = 0.6;
    quality = 0.4;
  } else {
    // Extreme compression needed
    scale = 0.5;
    quality = 0.3;
  }
  
  let result: Blob | null = null;
  let iterations = 0;
  const maxIterations = 8; // Increased for better convergence
  
  // Iteratively adjust compression until we meet target or max iterations
  while (iterations < maxIterations) {
    iterations++;
    const newPdf = await PDFDocument.create();
    
    for (let i = 0; i < totalPages; i++) {
      const page = await pdfDoc.getPage(i + 1);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement("canvas");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext("2d");
      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());
        const jpegImage = await newPdf.embedJpg(new Uint8Array(jpegBytes));
        const pdfPage = newPdf.addPage([viewport.width, viewport.height]);
        
        pdfPage.drawImage(jpegImage, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      }
      
      onProgress(Math.round(((i + 1) / totalPages) * 100));
    }
    
    const pdfBytes = await newPdf.save();
    result = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    
    // Check if we met the target (within 5% tolerance)
    if (result.size <= targetSizeBytes * 1.05) {
      break;
    }
    
    // Calculate how much more we need to compress
    const currentRatio = result.size / targetSizeBytes;
    
    // Aggressively reduce based on how far we are from target
    if (currentRatio > 3) {
      // Way too big - aggressive reduction
      quality -= 0.15;
      scale -= 0.1;
    } else if (currentRatio > 2) {
      // Still too big - moderate reduction
      quality -= 0.1;
      scale -= 0.05;
    } else {
      // Close - small adjustment
      quality -= 0.05;
    }
    
    // Enforce minimums
    if (quality < 0.25) {
      quality = 0.25;
      scale -= 0.1;
    }
    if (scale < 0.4) {
      scale = 0.4;
      // At minimum settings, just continue with what we have
      if (iterations > 3) break;
    }
  }
  
  return result!;
}

// Load PDF.js from CDN
async function loadPDFJSFromCDN(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only run in browser');
  }
  
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }
  
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      } else {
        reject(new Error("PDF.js did not expose pdfjsLib"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}
