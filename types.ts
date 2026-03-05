export type CompressionLevel = "low" | "medium" | "high"

export interface CompressedFile {
  originalFile: File
  compressedSize: number
  downloadUrl: string
}

export interface PageData {
  id: string
  pageIndex: number
  rotation: number
  thumbnailUrl?: string
  selected?: boolean
}

export interface PdfWithPages {
  id: string
  file: File
  pages: PageData[]
  name: string
}

export type PageSelectionMode = "single" | "range" | "multi"

