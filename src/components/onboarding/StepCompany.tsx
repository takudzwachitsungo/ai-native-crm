import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const INDUSTRIES = ['SaaS & Cloud Software', 'Financial Services & Fintech', 'Agency & Consulting', 'E-commerce & DTC', 'Healthcare & Life Sciences', 'Construction & Real Estate', 'Manufacturing & Supply Chain', 'Education & EdTech', 'Media & Publishing', 'Other'];
const REVENUE_MODELS = ['Subscriptions / Recurring', 'One-time sales', 'Project-based / Retainers', 'Usage-based / Metered', 'Mixed / Marketplace'];
const COMPANY_STAGES = ['Pre-revenue / Just starting', 'Early traction (< $1M ARR)', 'Growth stage ($1M–$10M)', 'Scaling ($10M–$50M)', 'Enterprise ($50M+)'];

export function StepCompany() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="ob-company" className="block text-[0.75rem] font-medium text-gray-700">Company name</label>
        <input
          id="ob-company"
          type="text"
          value={data.companyName}
          onChange={(e) => updateData({ companyName: e.target.value })}
          placeholder="Acme Inc."
          className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-all duration-150"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What industry are you in?</label>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ industry: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.industry === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">How do you generate revenue?</label>
        <div className="flex flex-wrap gap-1.5">
          {REVENUE_MODELS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ revenueModel: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.revenueModel === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Where is your company right now?</label>
        <div className="flex flex-wrap gap-1.5">
          {COMPANY_STAGES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ companyStage: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.companyStage === opt
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
