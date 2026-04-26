import React, { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

const FileUpload = ({ onFileSelect, disabled }) => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        onFileSelect(droppedFile);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      onFileSelect(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer
          ${dragActive ? "border-blue-500 bg-blue-500/10" : "border-slate-700 bg-[#0a0a0a]"}
          ${file ? "border-emerald-500/50 bg-emerald-500/5" : "hover:border-blue-400/60 hover:bg-blue-500/5"}
          ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={handleChange}
        />

        {!file ? (
          <>
            <div className="bg-blue-500/10 p-4 rounded-full mb-4 border border-blue-500/20">
              <Upload className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-slate-300">
              Drag & Drop Research Paper
            </p>
            <p className="text-xs text-slate-600 mt-1">PDF format • Click to browse</p>
          </>
        ) : (
          <div className="flex items-center space-x-4 w-full px-2">
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-200 text-sm truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              className="text-slate-500 hover:text-red-400 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;