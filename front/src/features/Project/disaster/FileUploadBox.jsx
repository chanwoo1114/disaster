import { useState, useRef } from 'react';
import FileUploadIcon from "../../../components/common/FileUploadIcon.jsx";

export default function FileUploadBox({ onFileSelect, maxSize = 500 }) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    if (file.size / (1024 * 1024) > maxSize) {
      alert(`파일 크기는 ${maxSize}MB를 초과할 수 없습니다.`);
      return;
    }

    setUploadedFile({
      name: file.name,
      size: fileSizeMB,
      file: file
    });

    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleBoxClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-12
        transition-all duration-200 cursor-pointer
        ${isDragging
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
      }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".zip"
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        <FileUploadIcon width="120" height="120" className="text-blue-500" />

        {uploadedFile ? (
          <>
            <p className="text-base font-semibold text-gray-800">
              {uploadedFile.name}
            </p>
            <p className="text-sm text-gray-500">
              파일 크기: {uploadedFile.size}MB
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-gray-700">
              클릭 혹은 파일을 이곳에 드롭하세요
            </p>
            <p className="text-sm text-gray-500">
              1개의 파일만 최대 {maxSize}MB
            </p>
          </>
        )}
      </div>
    </div>
  )
}
