import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const PIPELINE_OPTIONS = ['Standard (Lead → Qualified → Proposal → Closed)', 'Simple (Interested → Negotiating → Won/Lost)', 'Enterprise (Discovery → Demo → POC → Legal → Closed)', "Custom — I'll configure later"];
const CUSTOMER_TYPES = ['B2B', 'B2C', 'B2B + B2C', 'Marketplace / Platform'];
const DEAL_FLOW = ['< 10 deals/month', '10–50 deals/month', '50–200 deals/month', '200+ deals/month'];

export function StepSalesProcess() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">Preferred pipeline structure</label>
        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ pipelinePreference: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.pipelinePreference === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Type of customers</label>
        <div className="flex flex-wrap gap-1.5">
          {CUSTOMER_TYPES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ customerType: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.customerType === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Expected deal volume</label>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_FLOW.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ expectedDealFlow: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.expectedDealFlow === opt
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
