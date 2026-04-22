import React, { memo } from 'react';
import { Check } from 'lucide-react';

const StepIndicators = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto px-4">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-2 relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                currentStep > step.id
                  ? 'bg-green-600 border-green-600 text-white'
                  : currentStep === step.id
                  ? 'border-green-600 text-green-600 bg-green-50 dark:bg-green-900/20 shadow-sm'
                  : 'border-gray-300 text-gray-400 bg-white dark:bg-gray-800'
              }`}
            >
              {currentStep > step.id ? <Check className="w-5 h-5" /> : <span>{step.id}</span>}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest absolute -bottom-6 whitespace-nowrap ${
              currentStep === step.id ? 'text-green-600' : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default memo(StepIndicators);