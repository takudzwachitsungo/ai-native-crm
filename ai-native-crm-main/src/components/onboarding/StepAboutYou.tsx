import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const ROLE_OPTIONS = ['Founder / CEO', 'VP of Sales', 'Sales Manager', 'Sales Rep', 'RevOps', 'Marketing', 'Customer Success', 'Other'];
const TEAM_SIZE_OPTIONS = ['Just me', '2–5', '6–20', '21–50', '51–200', '200+'];

export function StepAboutYou() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      {/* Role */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What's your role?</label>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ role: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.role === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Team size */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">How large is your sales team?</label>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ teamSize: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.teamSize === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Job title */}
      <div className="space-y-1">
        <label htmlFor="ob-job-title" className="block text-[0.75rem] font-medium text-gray-700">Your job title</label>
        <input
          id="ob-job-title"
          type="text"
          value={data.jobTitle}
          onChange={(e) => updateData({ jobTitle: e.target.value })}
          placeholder="e.g. Head of Sales"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-all duration-150"
        />
      </div>
    </div>
  );
}
