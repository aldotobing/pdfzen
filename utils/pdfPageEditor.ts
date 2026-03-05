import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";

/**
 * Extract specific pages from a PDF into a new PDF.
 * @param file - The source PDF file
 * @param pageIndices - Array of 0-based page indices to extract
 * @returns A Blob representing the new PDF with extracted pages
 */
export async function splitPdfPages(
  file: File,
  pageIndices: number[]
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();

  const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Split PDF into individual page files.
 * @param file - The source PDF file
 * @returns Array of Blobs, each representing a single page PDF
 */
export async function splitPdfIntoIndividualPages(
  file: File
): Promise<{ name: string; blob: Blob; pageIndex: number }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = srcPdf.getPageCount();
  const results: { name: string; blob: Blob; pageIndex: number }[] = [];

  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(srcPdf, [i]);
    newPdf.addPage(copiedPage);

    const pdfBytes = await newPdf.save();
    results.push({
      name: `${file.name.replace(/\.pdf$/i, "")}_page_${i + 1}.pdf`,
      blob: new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      pageIndex: i,
    });
  }

  return results;
}

/**
 * Rotate pages in a PDF by specified angles.
 * @param file - The source PDF file
 * @param rotations - Map of page index to rotation angle in degrees
 * @returns A Blob representing the modified PDF
 */
export async function rotatePdfPages(
  file: File,
  rotations: Map<number, number>
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  rotations.forEach((angle, pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pages.length) {
      const page = pages[pageIndex];
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + angle));
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Delete specific pages from a PDF.
 * @param file - The source PDF file
 * @param pageIndicesToDelete - Array of 0-based page indices to delete
 * @returns A Blob representing the modified PDF
 */
export async function deletePdfPages(
  file: File,
  pageIndicesToDelete: number[]
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  // Create a set for O(1) lookup
  const deleteSet = new Set(pageIndicesToDelete);

  // Get indices to keep (pages not being deleted)
  const indicesToKeep: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!deleteSet.has(i)) {
      indicesToKeep.push(i);
    }
  }

  if (indicesToKeep.length === 0) {
    throw new Error("Cannot delete all pages. PDF must have at least one page.");
  }

  // Create new PDF with only the pages to keep
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, indicesToKeep);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Reorder pages in a PDF according to new order.
 * Can also extract a subset of pages (for deletion).
 * @param file - The source PDF file
 * @param newOrder - Array of page indices in the desired order (can be a subset for deletion)
 * @returns A Blob representing the reordered PDF
 */
export async function reorderPdfPages(
  file: File,
  newOrder: number[]
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = srcPdf.getPageCount();

  // Validate newOrder
  if (newOrder.length === 0) {
    throw new Error("New order must contain at least one page index.");
  }

  if (newOrder.length > totalPages) {
    throw new Error("New order contains more pages than the source PDF.");
  }

  const uniqueIndices = new Set(newOrder);
  if (uniqueIndices.size !== newOrder.length) {
    throw new Error("New order contains duplicate indices.");
  }

  // Validate all indices are within range
  for (const index of newOrder) {
    if (index < 0 || index >= totalPages) {
      throw new Error(`Invalid page index: ${index}. PDF has ${totalPages} pages.`);
    }
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, newOrder);
  copiedPages.forEach((page) => newPdf.addPage(page));

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Apply multiple operations to a PDF (rotate, delete, reorder).
 * @param file - The source PDF file
 * @param operations - Object containing rotations, deletions, and reorder
 * @returns A Blob representing the modified PDF
 */
export async function applyPdfPageOperations(
  file: File,
  operations: {
    rotations?: Map<number, number>;
    indicesToDelete?: number[];
    newOrder?: number[];
  }
): Promise<Blob> {
  let currentPdf = file;

  // Apply rotations first
  if (operations.rotations && operations.rotations.size > 0) {
    const rotatedBlob = await rotatePdfPages(currentPdf as File, operations.rotations);
    currentPdf = new File([rotatedBlob], currentPdf.name, { type: "application/pdf" });
  }

  // Apply deletions
  if (operations.indicesToDelete && operations.indicesToDelete.length > 0) {
    const deletedBlob = await deletePdfPages(currentPdf as File, operations.indicesToDelete);
    currentPdf = new File([deletedBlob], currentPdf.name, { type: "application/pdf" });
  }

  // Apply reordering
  if (operations.newOrder && operations.newOrder.length > 0) {
    const reorderedBlob = await reorderPdfPages(currentPdf as File, operations.newOrder);
    currentPdf = new File([reorderedBlob], currentPdf.name, { type: "application/pdf" });
  }

  return currentPdf as unknown as Blob;
}

/**
 * Note: Password protection requires additional libraries (e.g., hummus-pdf or qpdf).
 * This is a placeholder for future implementation.
 */
export async function protectPdfWithPassword(
  file: File,
  password: string
): Promise<Blob> {
  throw new Error("Password protection requires server-side processing. This feature is coming soon.");
}

export async function removePdfPassword(
  file: File,
  password: string
): Promise<Blob> {
  throw new Error("Password removal requires server-side processing. This feature is coming soon.");
}

export interface WatermarkOptions {
  text?: string;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  opacity?: number;
  rotation?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';
  scale?: number;
}

/**
 * Add a text watermark to a PDF.
 * @param file - The source PDF file
 * @param options - Watermark configuration options
 * @returns A Blob representing the watermarked PDF
 */
export async function addWatermarkToPdf(
  file: File,
  options: WatermarkOptions
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  const {
    text = 'CONFIDENTIAL',
    fontSize = 48,
    color = { r: 0.5, g: 0.5, b: 0.5 },
    opacity = 0.3,
    rotation = 45,
    position = 'center',
    scale = 1,
  } = options;

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const rgbColor = rgb(color.r, color.g, color.b);
    
    if (position === 'tile') {
      // Tile watermark across the page
      const stepX = width / 3;
      const stepY = height / 3;
      
      for (let x = stepX / 2; x < width; x += stepX) {
        for (let y = stepY / 2; y < height; y += stepY) {
          page.drawText(text, {
            x,
            y,
            size: fontSize * scale,
            color: rgbColor,
            opacity,
            rotate: degrees(rotation),
          });
        }
      }
    } else {
      // Single watermark at position
      let x = width / 2;
      let y = height / 2;
      
      switch (position) {
        case 'top-left':
          x = 50;
          y = height - 50;
          break;
        case 'top-right':
          x = width - 200;
          y = height - 50;
          break;
        case 'bottom-left':
          x = 50;
          y = 50;
          break;
        case 'bottom-right':
          x = width - 200;
          y = 50;
          break;
        case 'center':
        default:
          x = width / 2 - (text.length * fontSize * scale) / 4;
          y = height / 2;
          break;
      }
      
      page.drawText(text, {
        x,
        y,
        size: fontSize * scale,
        color: rgbColor,
        opacity,
        rotate: degrees(rotation),
      });
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Redact (permanently remove) content from specific page areas.
 * @param file - The source PDF file
 * @param redactions - Array of redaction rectangles {pageIndex, x, y, width, height}
 * @returns A Blob representing the redacted PDF
 */
export async function redactPdfPages(
  file: File,
  redactions: Array<{ pageIndex: number; x: number; y: number; width: number; height: number }>
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  redactions.forEach((redaction) => {
    if (redaction.pageIndex >= 0 && redaction.pageIndex < pages.length) {
      const page = pages[redaction.pageIndex];

      // Draw black rectangle over the area
      page.drawRectangle({
        x: redaction.x,
        y: redaction.y,
        width: redaction.width,
        height: redaction.height,
        color: rgb(0, 0, 0),
      });
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
