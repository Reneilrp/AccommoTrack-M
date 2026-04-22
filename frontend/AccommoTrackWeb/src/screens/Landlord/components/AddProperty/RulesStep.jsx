import React, { memo } from 'react';
import { Plus, X } from 'lucide-react';

const COMMON_RULES = [
  'No smoking',
  'No pets allowed',
  'No visitors after 10 PM',
  'Quiet hours: 10 PM - 6 AM',
  'Keep common areas clean',
  'Respect other tenants',
  'No cooking in rooms'
];

const RulesStep = ({ rules, onAddRule, onRemoveRule, newRuleValue, onRuleValueChange }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Property Rules</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Add house rules and policies for your property</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add Rule
          </label>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="e.g., No smoking inside the premises"
              value={newRuleValue}
              onChange={(e) => onRuleValueChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddRule();
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={onAddRule}
              disabled={!newRuleValue.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Press Enter or click Add to include the rule</p>
        </div>

        {/* Common Rules Suggestions */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Common Rules:</p>
          <div className="grid grid-cols-3 gap-4">
            {COMMON_RULES.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  if (rules.includes(suggestion)) {
                    const idx = rules.indexOf(suggestion);
                    onRemoveRule(idx);
                  } else {
                    onRuleValueChange(suggestion);
                    setTimeout(() => onAddRule(), 0);
                  }
                }}
                className={`px-4 py-4 rounded-lg border-2 text-left transition-all ${rules.includes(suggestion)
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Rules List */}
        {Array.isArray(rules) && rules.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Your Property Rules:</p>
            <div className="grid grid-cols-3 gap-4">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 group hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                >
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{rule}</p>
                  <button
                    onClick={() => onRemoveRule(index)}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RulesStep);