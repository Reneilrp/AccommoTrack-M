import React, { memo } from 'react';
import { FileText, Plus, Trash, GripVertical } from 'lucide-react';

const RulesStep = ({ rules, onAddRule, onRemoveRule, newRuleValue, onRuleValueChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          House Rules
        </h3>
        <p className="text-sm text-gray-500">Define the rules and policies for your residents.</p>
      </div>

      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl group border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all">
            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{rule}</span>
            <button
              type="button"
              onClick={() => onRemoveRule(idx)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="py-12 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl text-center">
             <p className="text-gray-400 text-sm italic">No rules added yet.</p>
          </div>
        )}
      </div>

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
          disabled={!newRuleValue.trim()}
          className="px-6 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/10 active:scale-95 disabled:opacity-50"
        >
          Add Rule
        </button>
      </div>
    </div>
  );
};

export default memo(RulesStep);