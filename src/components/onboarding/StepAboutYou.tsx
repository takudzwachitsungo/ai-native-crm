import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const ROLE_OPTIONS = ['Closing deals daily', 'Managing a sales team', 'Running the business', 'Operations & RevOps', 'Driving marketing & demand gen', 'Supporting customers post-sale'];
const CRM_EXPERIENCE_OPTIONS = ['First time — I\'m new to CRMs', 'Tried one before but it never stuck', 'Yes, I have a clear workflow already', 'Migrating from another CRM'];

export function StepAboutYou() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      {/* Role */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What best describes your day-to-day?</label>
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

      {/* CRM experience */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">Have you used a CRM before?</label>
        <div className="flex flex-wrap gap-1.5">
          {CRM_EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ crmExperience: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.crmExperience === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Biggest challenge */}
      <div className="space-y-1">
        <label htmlFor="ob-challenge" className="block text-[0.75rem] font-medium text-gray-700">What's your biggest frustration managing customer relationships right now?</label>
        <input
          id="ob-challenge"
          type="text"
          value={data.biggestChallenge}
          onChange={(e) => updateData({ biggestChallenge: e.target.value })}
          placeholder="e.g. Leads fall through the cracks, no visibility into pipeline"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-all duration-150"
        />
      </div>
    </div>
  );
}
