import { PDFDocument } from "pdf-lib";

/**
 * Merges multiple PDF files into one.
 * @param files - An array of File objects (PDFs) to be merged.
 * @returns A Blob representing the merged PDF.
 */
export async function mergePDFs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(fileBuffer);

    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  const outputBytes = Uint8Array.from(mergedPdfBytes);
  return new Blob([outputBytes], { type: "application/pdf" });
}
