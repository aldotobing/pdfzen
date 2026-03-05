import { PDFDocument, degrees, PageSizes } from "pdf-lib";

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
 * Generate a thumbnail canvas for a PDF page.
 * @param file - The PDF file
 * @param pageIndex - The page index (0-based)
 * @param width - Desired thumbnail width
 * @returns Image data URL for the thumbnail
 */
export async function generatePageThumbnail(
  file: File,
  pageIndex: number,
  width: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const pdf = await import("pdfjs-dist");
        const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
        const loadingTask = pdf.getDocument({ data: typedArray });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(pageIndex + 1);

        const viewport = page.getViewport({ scale: 1 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        if (context) {
          await page.render({
            canvas,
            viewport: scaledViewport,
          }).promise;

          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } else {
          reject(new Error("Could not get canvas context"));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
