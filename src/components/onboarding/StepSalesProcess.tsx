import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const SALES_MOTION_OPTIONS = ['Inbound-led (marketing drives leads)', 'Outbound-led (reps prospect & cold-call)', 'Product-led (self-serve + sales assist)', 'Channel / Partner-led', 'Hybrid — mix of approaches'];
const DEAL_CYCLE_OPTIONS = ['Less than a week', '1–4 weeks', '1–3 months', '3–6 months', '6+ months'];
const DEAL_SIZE_OPTIONS = ['Under $1K', '$1K–$10K', '$10K–$50K', '$50K–$250K', '$250K+'];

export function StepSalesProcess() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">How does your team typically close deals?</label>
        <div className="flex flex-wrap gap-1.5">
          {SALES_MOTION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ salesMotion: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.salesMotion === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">How long does it take to close a typical deal?</label>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_CYCLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ avgDealCycle: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.avgDealCycle === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What's your average deal size?</label>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ avgDealSize: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.avgDealSize === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
