import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import type React from "react";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Shrink, Merge, and Ship PDFs Faster | Private PDF Workspace",
  description:
    "A professional PDF workspace to compress and merge files with speed, clarity, and local-first privacy.",
  generator: "PDF Zen Studio",
  keywords: [
    "PDF compressor",
    "PDF merger",
    "compress PDF",
    "merge PDF",
    "private PDF workspace",
    "local PDF tools",
  ],
  applicationName: "PDF Zen Studio",
  openGraph: {
    title: "Shrink, Merge, and Ship PDFs Faster | Private PDF Workspace",
    description:
      "Compress and merge PDF files in a streamlined local workspace without uploading your documents.",
    url: "https://pdfzen.vercel.app",
    siteName: "PDF Zen Studio",
    images: [
      {
        url: "https://pdfzen.vercel.app/assets/img/pdf.jpg",
        width: 1200,
        height: 630,
        alt: "PDF Zen Studio Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shrink, Merge, and Ship PDFs Faster | Private PDF Workspace",
    description:
      "Compress and merge PDF files locally with a polished, professional workflow.",
    images: ["https://pdfzen.vercel.app/assets/img/pdf.jpg"],
  },
  alternates: {
    canonical: "https://pdfzen.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Aldo Tobing" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "PDF Zen Studio",
              url: "https://pdfzen.vercel.app",
              description:
                "Professional local PDF workspace for compressing and merging files.",
              applicationCategory: "Utility",
              operatingSystem: "All",
            }),
          }}
        />
      </head>
      <body className={`${plusJakartaSans.variable} ${sora.variable}`}>
        {children}
      </body>
    </html>
  );
}
