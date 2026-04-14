import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const NOTIFICATION_OPTIONS = ['All notifications', 'Important only', 'Minimal — just assignments', 'None for now'];
const AUTOMATION_OPTIONS = ['Lead scoring', 'Auto follow-up reminders', 'Deal stage progression alerts', 'SLA escalation', 'Email sequences', 'Territory-based routing'];
const DASHBOARD_OPTIONS = ['Pipeline overview', 'Revenue forecast', 'Team leaderboard', 'Activity feed', 'AI insights panel', 'Campaign metrics'];

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

export function StepPreferences() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">Notification preference</label>
        <div className="flex flex-wrap gap-1.5">
          {NOTIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ notificationPref: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.notificationPref === opt
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Automations you're interested in</label>
        <ToggleChips options={AUTOMATION_OPTIONS} selected={data.automationInterests} onChange={(v) => updateData({ automationInterests: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">Dashboard widgets you'd like</label>
        <ToggleChips options={DASHBOARD_OPTIONS} selected={data.dashboardPrefs} onChange={(v) => updateData({ dashboardPrefs: v })} />
      </div>
    </div>
  );
}
