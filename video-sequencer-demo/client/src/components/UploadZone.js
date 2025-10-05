import React, { useState, useRef } from 'react';
import { Upload, Video } from 'lucide-react';

const UploadZone = ({ onUpload, onLoadExisting, isLoading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('video/')
    );

    if (files.length > 0 && files.length <= 20) {
      onUpload(files);
    } else if (files.length > 20) {
      alert('Maximum 20 videos allowed');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && files.length <= 20) {
      onUpload(files);
    } else if (files.length > 20) {
      alert('Maximum 20 videos allowed');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Video Sequencer Demo</h1>
        <p className="text-lg text-gray-600">
          Upload up to 20 video clips to create an AI-powered sequence
        </p>
      </div>

      <div
        className={`
          border-2 border-dashed rounded-lg p-12 w-full max-w-2xl text-center cursor-pointer
          transition-colors duration-200 ease-in-out
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isLoading ? handleClick : undefined}
      >
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg text-gray-600">Processing videos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex space-x-4 mb-6">
              <Upload className="h-12 w-12 text-gray-400" />
              <Video className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-xl font-medium text-gray-700 mb-2">
              Drop video files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports MP4, MOV, AVI • Max 20 files • Up to 100MB each
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />
      </div>

      {onLoadExisting && (
        <div className="mt-8">
          <div className="text-center">
            <div className="text-gray-500 mb-4">Or</div>
            <button
              onClick={onLoadExisting}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Load Existing Clips from Index
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Use your 4 already-indexed clips
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadZone;