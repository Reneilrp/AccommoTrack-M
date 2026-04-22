import React, { memo } from 'react';
import { ShieldAlert, Plus, Trash, GripVertical } from 'lucide-react';

const HouseRulesSection = ({ 
  rules, 
  onAddRule, 
  onRemoveRule, 
  newRuleValue, 
  onRuleValueChange, 
  isEditing 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <ShieldAlert className="w-5 h-5 text-green-600" />
        House Rules
      </h3>

      <div className="space-y-3 mb-6">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl group border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{rule}</span>
            {isEditing && (
              <button
                type="button"
                onClick={() => onRemoveRule(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
            No specific house rules added yet.
          </p>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newRuleValue}
            onChange={(e) => onRuleValueChange(e.target.value)}
            placeholder="e.g. No visitors after 10 PM"
            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm dark:text-white"
          />
          <button
            type="button"
            onClick={onAddRule}
            className="px-6 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/10 active:scale-95"
          >
            Add Rule
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(HouseRulesSection);