# 📄 PDFZen

**Your complete PDF workspace in the browser. Compress, merge, edit, and secure your PDFs with powerful tools—all running locally on your device. Your files never leave your browser, ensuring maximum privacy and security.**

![PDFZen](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 🚀 Features

### 🗜️ Compress PDFs
- **3 Compression Levels**: Archive (Low), Balanced (Medium), Web (High)
- **Batch Processing**: Compress multiple PDFs at once
- **Smart Recommendations**: Auto-suggests optimal compression level
- **Download as ZIP**: Get all compressed files in one archive

### 🔗 Merge PDFs
- **Combine Multiple Files**: Merge unlimited PDFs into one
- **Custom Order**: Reorder files before merging
- **Instant Preview**: See file sizes and page counts

### ✂️ Page Editor
- **Rotate Pages**: Fix orientation issues (90° increments)
- **Delete Pages**: Remove unwanted pages
- **Reorder Pages**: Drag-and-drop to rearrange
- **Split PDF**: Extract pages or split into individual files
- **Hover Preview**: Large preview modal on hover (800ms delay)
- **Undo/Redo**: Up to 50 history states
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+R (rotate), Delete, Ctrl+S (save)

### 🔒 Security Tools
- **Password Protection**: Add RC4 128-bit encryption
- **Watermark**: Add custom text watermarks
  - Adjustable font size, opacity, rotation
  - Multiple positions + tile mode
  - Color presets (gray, red, blue, black)
- **Redaction**: Permanently remove sensitive content (coming soon)

### 🎨 User Experience
- **Drag & Drop Upload**: Intuitive file upload
- **Dark/Light Theme**: Beautiful themes for any preference
- **Real-time Progress**: Live compression feedback
- **Instant Downloads**: No waiting after processing
- **100% Client-Side**: Files never leave your browser

---

## 🎯 Why Use PDFZen?

Large or unorganized PDFs **slow you down**. PDFZen helps you:

| Benefit | Description |
|---------|-------------|
| 📩 **Send files faster** | Compress large PDFs for email |
| 📂 **Save storage space** | Reduce file sizes by up to 70% |
| ⚡ **Boost loading speed** | Optimize PDFs for web viewing |
| 📑 **Stay organized** | Merge, split, and reorder with ease |
| 🔐 **Protect sensitive data** | Add passwords and watermarks |
| 🛡️ **Privacy-first** | All processing happens locally |

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the repo

```sh
git clone https://github.com/aldotobing/pdfzen.git
cd pdfzen
```

### 2️⃣ Install dependencies

```sh
npm install
# or
pnpm install
```

### 3️⃣ Run the app

```sh
npm run dev
# or
pnpm dev
```

Now open **`http://localhost:3000`** in your browser! 🎉

---

## 🖥️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Smooth animations |
| **pdf-lib** | PDF manipulation |
| **PDF.js** | PDF rendering & thumbnails |
| **pdf-encrypt-lite** | Password protection (RC4) |
| **JSZip** | Batch download as ZIP |
| **React Dropzone** | Drag & drop upload |
| **Radix UI** | Accessible components |

---

## 📌 Usage Guide

### Compress PDFs
1. Upload PDF files (drag & drop or click to browse)
2. Select compression level:
   - **Archive** (25% reduction) - Best quality
   - **Balanced** (45% reduction) - Recommended
   - **Web** (70% reduction) - Smallest size
3. Click "Run Compression"
4. Download individual files or all as ZIP

### Merge PDFs
1. Upload multiple PDFs
2. Reorder files using ↑↓ arrows
3. Click "Merge Files"
4. Download the combined PDF

### Edit Pages
1. Upload a PDF
2. Click **Edit Pages** mode
3. Select a file → Click "Edit Pages"
4. Use the full-page editor to:
   - Hover over thumbnails for preview
   - Click to select, Shift+Click for range, Ctrl+Click for multi-select
   - Rotate, delete, or reorder pages
   - Split selected pages or all pages
5. Click "Save PDF" to download

### Security Tools
1. Upload a PDF
2. Click **Security** mode
3. Select a file → Click "Security Tools"
4. Choose a tool:
   - **Password**: Enter password (min 4 chars) → Download protected PDF
   - **Watermark**: Customize text, size, position → Download watermarked PDF
   - **Redact**: (Coming soon) Select areas to permanently remove

---

## ⌨️ Keyboard Shortcuts (Page Editor)

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+R` | Rotate selected pages |
| `Delete` / `Backspace` | Delete selected pages |
| `Ctrl+A` | Select all pages |
| `Escape` | Deselect all |
| `Ctrl+S` | Save edited PDF |

---

## 🌐 Live Demo

Visit **[pdfzen.app](https://pdfzen.app)** to try it online!

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🤝 Contributing

💡 **Want to contribute?** Fork the repo and make a pull request!

### Ways to help:
- 🐛 Report bugs
- ✨ Suggest new features
- 📝 Improve documentation
- 🌍 Add translations
- 🧪 Write tests

---

## 👨‍💻 Author

**Aldo Tobing**
- GitHub: [@aldotobing](https://github.com/aldotobing)
- Twitter: [@aldo_tobing](https://twitter.com/aldo_tobing)

---

## 🙏 Acknowledgments

- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation library
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering by Mozilla
- [pdf-encrypt-lite](https://github.com/smither777/pdfsmaller-pdfencryptlite) - Lightweight PDF encryption
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components

---

**Made with ❤️ for a more productive workflow**
