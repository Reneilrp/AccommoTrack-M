import React, { memo } from 'react';
import { Pencil, Trash2, Check, X, Loader2, Sparkles } from 'lucide-react';

const AddonTable = ({ addons, onEdit, onDelete, onToggleStatus, togglingAddonId }) => {
  if (addons.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <Sparkles className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="font-medium">No add-ons created yet.</p>
        <p className="text-sm">
          Create add-ons to offer extra usage fees to your tenants.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
      {addons.map((addon) => (
        <div
          key={addon.id}
          className={`border rounded-xl p-6 transition-all shadow-sm ${addon.is_active ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                  {addon.name}
                </h4>
                {!addon.is_active && (
                  <span className="text-[10px] font-bold uppercase bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    addon.price_type === "monthly"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                  }`}
                >
                  {addon.price_type === "monthly" ? "Monthly" : "One-time"}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    addon.addon_type === "rental"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {addon.addon_type === "rental" ? "Rental" : "Fee"}
                </span>
              </div>
              {addon.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
                  {addon.description}
                </p>
              )}
              <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-4">
                ₱{Number((addon.price_cents ?? addon.price ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {addon.price_type === "monthly" && (
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-500 ml-2">
                    / mo
                  </span>
                )}
              </p>
              {addon.stock !== null && addon.stock !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-medium">
                  Available Stock: {addon.stock}
                </p>
              )}
            </div>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => onToggleStatus(addon)}
                disabled={togglingAddonId === addon.id}
                title={addon.is_active ? "Deactivate add-on" : "Activate add-on"}
                className={`p-2 rounded-lg transition-colors disabled:opacity-60 ${
                  addon.is_active
                    ? "text-gray-500 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                    : "text-gray-500 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                }`}
              >
                {togglingAddonId === addon.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : addon.is_active ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => onEdit(addon)}
                className="p-2 text-gray-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(addon.id)}
                className="p-2 text-gray-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(AddonTable);