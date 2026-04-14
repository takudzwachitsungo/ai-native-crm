import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const INDUSTRIES = ['Technology', 'Financial Services', 'Healthcare', 'Manufacturing', 'Retail & E-commerce', 'Professional Services', 'Real Estate', 'Education', 'Media & Entertainment', 'Other'];
const BUSINESS_SIZES = ['1–10 employees', '11–50', '51–200', '201–1000', '1000+'];

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
        <label className="block text-[0.75rem] font-medium text-gray-700">Industry</label>
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Business size</label>
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_SIZES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ businessSize: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.businessSize === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="ob-country" className="block text-[0.75rem] font-medium text-gray-700">Country / Region</label>
        <input
          id="ob-country"
          type="text"
          value={data.country}
          onChange={(e) => updateData({ country: e.target.value })}
          placeholder="e.g. United States"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-all duration-150"
        />
      </div>
    </div>
  );
}
