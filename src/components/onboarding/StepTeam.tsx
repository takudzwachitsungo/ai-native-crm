import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Users, Mail, Network } from 'lucide-react';

const USER_COUNT_OPTIONS = ['Just me', '2–5', '6–20', '21–50', '50+'];
const TEAM_STRUCTURE_OPTIONS = ['Flat — everyone does everything', 'By territory or region', 'By product line or segment', 'SDR → AE → CSM handoff', 'Individual contributor (solo)'];

export function StepTeam() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">
          <span className="flex items-center gap-1.5"><Users size={14} /> How many people will use the CRM day-to-day?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {USER_COUNT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ expectedUsers: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.expectedUsers === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">
          <span className="flex items-center gap-1.5"><Network size={14} /> How is your sales team organised?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_STRUCTURE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ teamStructure: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.teamStructure === opt
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
        <label htmlFor="ob-invite" className="block text-[0.75rem] font-medium text-gray-700">
          <span className="flex items-center gap-1.5"><Mail size={14} /> Invite teammates to get started together</span>
        </label>
        <textarea
          id="ob-invite"
          rows={2}
          value={data.inviteEmails}
          onChange={(e) => updateData({ inviteEmails: e.target.value })}
          placeholder="jane@company.com, mark@company.com"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-[0.8125rem] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 hover:border-gray-300 transition-all duration-150 resize-none"
        />
        <p className="text-[0.7rem] text-gray-400">Comma-separated emails. You can always add more later.</p>
      </div>
    </div>
  );
}
