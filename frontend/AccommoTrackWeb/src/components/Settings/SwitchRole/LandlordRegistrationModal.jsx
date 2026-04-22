import React, { memo } from 'react';
import { X, Upload } from 'lucide-react';

const LandlordRegistrationModal = ({
  isOpen,
  onClose,
  idTypes,
  form,
  errors,
  onChange,
  onFileChange,
  onSubmit,
  isSubmitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register as Landlord</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Provide your valid ID type, upload front and back ID images, and upload your business permit. Name and date of birth will be taken from your tenant account.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid ID Type</label>
              <select
                value={form.valid_id_type}
                onChange={(e) => onChange('valid_id_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select ID type</option>
                {idTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
                {!idTypes.includes('Other') && <option value="Other">Other</option>}
              </select>
              {errors.valid_id_type && <p className="text-xs text-red-500 mt-1">{errors.valid_id_type}</p>}
            </div>

            {form.valid_id_type === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specify ID Type</label>
                <input
                  type="text"
                  value={form.valid_id_other}
                  onChange={(e) => onChange('valid_id_other', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.valid_id_other && <p className="text-xs text-red-500 mt-1">{errors.valid_id_other}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Valid ID Front Image</label>
              <label className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <Upload className="w-4 h-4" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {form.valid_id_front ? form.valid_id_front.name : 'Choose image (JPG/PNG, max 5MB)'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,image/*"
                  onChange={(e) => onFileChange('valid_id_front', e.target.files?.[0] || null)}
                />
              </label>
              {errors.valid_id_front && <p className="text-xs text-red-500 mt-1">{errors.valid_id_front}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Valid ID Back Image (Optional)</label>
              <label className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <Upload className="w-4 h-4" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {form.valid_id_back ? form.valid_id_back.name : 'Choose image (JPG/PNG, max 5MB)'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,image/*"
                  onChange={(e) => onFileChange('valid_id_back', e.target.files?.[0] || null)}
                />
              </label>
              {errors.valid_id_back && <p className="text-xs text-red-500 mt-1">{errors.valid_id_back}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Business/Accommodation Permit</label>
              <label className="w-full px-4 py-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                <Upload className="w-4 h-4" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {form.permit ? form.permit.name : 'Choose file (JPG, PNG, PDF, max 5MB)'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                  onChange={(e) => onFileChange('permit', e.target.files?.[0] || null)}
                />
              </label>
              {errors.permit && <p className="text-xs text-red-500 mt-1">{errors.permit}</p>}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(LandlordRegistrationModal);