import React, { memo } from 'react';
import { Image as ImageIcon, Upload, Trash, Star, Play, Video, X } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const GallerySection = ({ 
  images, 
  video, 
  onUploadImage, 
  onRemoveImage, 
  onSetThumbnail, 
  onUploadVideo, 
  onRemoveVideo, 
  isEditing 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <ImageIcon className="w-5 h-5 text-green-600" />
        Property Gallery
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden group border border-gray-100 dark:border-gray-700">
            <img 
              src={img.url || getImageUrl(img.path)} 
              className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              alt={`Gallery ${idx}`} 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => onSetThumbnail(idx)}
                    className={`p-2 rounded-lg ${img.is_thumbnail ? 'bg-yellow-400 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                    title="Set as Thumbnail"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveImage(idx)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Delete Image"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {img.is_thumbnail && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-white text-[10px] font-bold uppercase rounded shadow-sm">
                Main Image
              </div>
            )}
          </div>
        ))}
        {isEditing && images.length < 8 && (
          <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Photo</span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => onUploadImage(e.target.files[0])} />
          </label>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Virtual Tour / Video</label>
        {video ? (
          <div className="relative aspect-video max-w-md rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 group">
            <video 
              src={video.url || getImageUrl(video.path)} 
              className="w-full h-full object-cover" 
              controls={!isEditing} 
            />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={onRemoveVideo}
                  className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
              <Video className="w-4 h-4 text-green-400" />
              VIDEO LOADED
            </div>
          </div>
        ) : isEditing ? (
          <label className="max-w-md aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6" />
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-gray-500">Click to upload video</span>
              <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">MP4/MOV up to 50MB</span>
            </div>
            <input type="file" className="hidden" accept="video/*" onChange={(e) => onUploadVideo(e.target.files[0])} />
          </label>
        ) : (
          <p className="text-sm text-gray-400 italic py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center border border-dashed border-gray-200 dark:border-gray-600">
            No video tour available.
          </p>
        )}
      </div>
    </div>
  );
};

export default memo(GallerySection);