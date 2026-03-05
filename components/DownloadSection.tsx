import { motion, AnimatePresence } from "framer-motion";
import type { CompressedFile } from "../types";
import { FiDownload, FiPlus, FiCheckCircle } from "react-icons/fi";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DownloadSectionProps {
  compressedFiles: CompressedFile[];
  onReset: () => void; // tambahin prop onReset
}

export default function DownloadSection({
  compressedFiles,
  onReset,
}: DownloadSectionProps) {
  const handleDownloadAll = async () => {
    if (compressedFiles.length === 0) return;
    const zip = new JSZip();
    compressedFiles.forEach((file) => {
      zip.file(
        `compressed_${file.originalFile.name}`,
        fetch(file.downloadUrl).then((res) => res.blob())
      );
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "compressed_PDF_files.zip");
  };

  // Ubah fungsi New Session jadi reset
  const handleNewSession = () => {
    onReset();
  };

  const tableRowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mt-8 antialiased"
    >
      <h2 className="text-xl font-medium tracking-tight text-gray-800 mb-6">
        Compressed Files
      </h2>

      <div className="overflow-hidden rounded-xl shadow-lg bg-white">
        <div className="hidden md:block">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-50/80 text-gray-600 tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  File Name
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Original Size
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Compressed Size
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Reduction
                </th>
                <th scope="col" className="px-6 py-4 text-center font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {compressedFiles.map((file, index) => (
                  <motion.tr
                    key={index}
                    custom={index}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white hover:bg-blue-50/50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 text-gray-900 text-xs font-medium break-words">
                      {file.originalFile.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatFileSize(file.originalFile.size)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {formatFileSize(file.compressedSize)}
                    </td>
                    <td className="px-6 py-4">
                      <motion.div
                        className="flex items-center text-green-600 font-medium text-xs"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                      >
                        <FiCheckCircle className="mr-1.5" />
                        {calculateReduction(
                          file.originalFile.size,
                          file.compressedSize
                        )}
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <motion.a
                        href={file.downloadUrl}
                        download={`compressed_${file.originalFile.name}`}
                        className="text-blue-600 font-medium hover:text-blue-700 transition-colors text-xs"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Download
                      </motion.a>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="block md:hidden space-y-3 p-4">
          <AnimatePresence>
            {compressedFiles.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="bg-white rounded-lg p-4 border border-gray-100 text-xs space-y-2"
              >
                <div className="space-y-1">
                  <div className="text-gray-500">File Name</div>
                  <div className="font-medium text-gray-900 break-words">
                    {file.originalFile.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500">Original Size</div>
                    <div className="font-medium text-gray-900">
                      {formatFileSize(file.originalFile.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Compressed Size</div>
                    <div className="font-medium text-gray-900">
                      {formatFileSize(file.compressedSize)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center text-green-600 font-medium">
                    <FiCheckCircle className="mr-1.5" />
                    {calculateReduction(
                      file.originalFile.size,
                      file.compressedSize
                    )}
                  </div>
                  <motion.a
                    href={file.downloadUrl}
                    download={`compressed_${file.originalFile.name}`}
                    className="text-blue-600 font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Download
                  </motion.a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-between mt-8 gap-4">
        <motion.button
          onClick={handleDownloadAll}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 1.02 }}
          className="bg-blue-600 text-white w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
        >
          <FiDownload className="text-lg" />
          <span className="hidden md:inline ml-2">Download All</span>
        </motion.button>

        <motion.button
          onClick={handleNewSession}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 1.02 }}
          className="bg-gray-800 text-white w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 rounded-lg font-medium shadow-sm hover:bg-gray-900 transition-colors duration-200 flex items-center justify-center"
        >
          <FiPlus className="text-lg" />
          <span className="hidden md:inline ml-2">New Session</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

function calculateReduction(
  originalSize: number,
  compressedSize: number
): string {
  const reduction = ((originalSize - compressedSize) / originalSize) * 100;
  return reduction.toFixed(1) + "%";
}

