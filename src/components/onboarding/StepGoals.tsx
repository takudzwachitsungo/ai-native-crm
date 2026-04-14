import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const GOAL_OPTIONS = [
  'Manage leads & pipeline',
  'Automate follow-ups',
  'Forecast revenue',
  'Track team performance',
  'Send & track emails',
  'Manage quotes & invoices',
  'Support case management',
  'AI-powered insights',
];
const PRIORITY_OPTIONS = ['Close more deals', 'Reduce manual work', 'Better visibility', 'Improve team collaboration', 'Faster onboarding for reps', 'Data-driven decisions'];

function ToggleChips({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
            ${selected.includes(opt)
              ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function StepGoals() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What should this CRM help you do?</label>
        <p className="text-[0.7rem] text-gray-400">Select all that apply.</p>
        <ToggleChips options={GOAL_OPTIONS} selected={data.crmGoals} onChange={(v) => updateData({ crmGoals: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">Your top priorities right now</label>
        <p className="text-[0.7rem] text-gray-400">Pick up to 3.</p>
        <ToggleChips
          options={PRIORITY_OPTIONS}
          selected={data.topPriorities}
          onChange={(v) => updateData({ topPriorities: v.length <= 3 ? v : v.slice(-3) })}
        />
      </div>
    </div>
  );
}
