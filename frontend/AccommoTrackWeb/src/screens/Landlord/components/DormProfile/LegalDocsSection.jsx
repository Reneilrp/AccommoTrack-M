import React, { memo } from 'react';
import { FileText, Upload, Trash, X } from 'lucide-react';
import { getImageUrl } from '../../../../utils/api';

const LegalDocsSection = ({ docs, onUploadDoc, onRemoveDoc, isEditing }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-green-600" />
        Legal Documents & Permits
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((doc, idx) => (
          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {doc.name || `Document #${idx + 1}`}
                </p>
                <button
                  type="button"
                  onClick={() => window.open(getImageUrl(doc.path), '_blank')}
                  className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase hover:underline"
                >
                  View Document
                </button>
              </div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={() => onRemoveDoc(idx)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {isEditing && (
          <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group">
            <Upload className="w-5 h-5 text-gray-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-gray-500">Upload New Permit</span>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onUploadDoc(e.target.files[0])} />
          </label>
        )}

        {!isEditing && docs.length === 0 && (
          <div className="col-span-full py-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center border border-dashed border-gray-200 dark:border-gray-600">
            <p className="text-sm text-gray-400 italic">No legal documents uploaded.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(LegalDocsSection);