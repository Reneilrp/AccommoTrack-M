import React, { memo } from 'react';
import { Camera, Plus, X, Video, Play } from 'lucide-react';

const GalleryStep = ({ 
  images, 
  onUploadImage, 
  onRemoveImage, 
  onSetThumbnail, 
  videoPreview, 
  onUploadVideo, 
  onRemoveVideo 
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Property Images */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white shrink-0">Property Images</h2>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 hover:border-green-500 dark:hover:border-green-500 transition-colors group">
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg"
            onChange={(e) => {
              Array.from(e.target.files).forEach(file => onUploadImage(file));
            }}
            className="hidden"
            id="image-upload"
          />
          
          {images.length === 0 ? (
            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-green-500 transition-colors">
                <Camera className="w-10 h-10" />
                <span className="text-sm font-medium">Click to upload or drag and drop</span>
                <span className="text-xs">PNG, JPG up to 10MB</span>
              </div>
            </label>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden group">
                    <img
                      src={img.preview}
                      alt={`Property ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onRemoveImage(index)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {img.isThumbnail && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-white text-[10px] font-bold uppercase rounded shadow-sm">
                        Cover
                      </div>
                    )}
                  </div>
                ))}
                {images.length < 10 && (
                  <label htmlFor="image-upload" className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                    <Plus className="w-8 h-8 text-gray-500" />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Video Tour */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-green-600" />
            Property Video Tour
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">(Optional)</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Upload a short video tour of your property. Max <strong>45 seconds</strong> and <strong>200MB</strong>.
          </p>
        </div>

        {!videoPreview ? (
          <label
            htmlFor="video-upload"
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-green-500 dark:hover:border-green-500 bg-gray-50 dark:bg-gray-700/50 transition-colors group"
          >
            <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-green-500 transition-colors">
              <Play className="w-10 h-10" />
              <span className="text-sm font-medium">Click to upload video</span>
              <span className="text-xs">MP4, MOV, AVI (max 200MB, 45s)</span>
            </div>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => onUploadVideo(e.target.files[0])}
            />
          </label>
        ) : (
          <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-black">
            <video
              src={videoPreview}
              className="w-full max-h-64 object-contain"
              controls
            />
            <button
              type="button"
              onClick={onRemoveVideo}
              className="absolute top-2 right-2 p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-2 rounded font-bold flex items-center gap-2">
              <Video className="w-3 h-3" /> VIDEO TOUR
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(GalleryStep);