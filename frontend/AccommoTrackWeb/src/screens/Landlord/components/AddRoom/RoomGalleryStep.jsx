import React, { memo } from 'react';
import { Camera, Upload, X, Star } from 'lucide-react';

const RoomGalleryStep = ({ images, onUploadImage, onRemoveImage, onSetThumbnail }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-600" />
          Room Photos
        </h3>
        <p className="text-sm text-gray-500">Showcase the specific interior and features of this room.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 dark:border-gray-700">
            <img src={img.preview} className="w-full h-full object-cover" alt="Room" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onSetThumbnail(idx)}
                className={`p-2 rounded-lg ${img.isThumbnail ? 'bg-yellow-400 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                title="Set as Thumbnail"
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {img.isThumbnail && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-white text-[10px] font-bold uppercase rounded shadow-sm">
                Main
              </div>
            )}
          </div>
        ))}
        {images.length < 5 && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center px-2">Upload Room Photo</span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => onUploadImage(e.target.files[0])} />
          </label>
        )}
      </div>
    </div>
  );
};

export default memo(RoomGalleryStep);