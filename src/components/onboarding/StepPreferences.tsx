import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

const NOTIFICATION_OPTIONS = ['Real-time — notify me about everything', 'Smart digest — important stuff only', 'Minimal — just my assignments & mentions', 'Quiet — I\'ll check manually'];
const AUTOMATION_OPTIONS = ['Auto-score & prioritise leads', 'Follow-up reminders when deals go cold', 'Deal stage progression alerts', 'SLA escalation for support tickets', 'Email sequences & drip campaigns', 'Round-robin lead assignment'];
const DASHBOARD_OPTIONS = ['Live pipeline overview', 'Revenue forecast & trends', 'Team activity leaderboard', 'Win/loss analysis', 'AI-powered deal insights', 'Campaign ROI metrics'];

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
        <label className="block text-[0.75rem] font-medium text-gray-700">How do you want to be notified?</label>
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
        <label className="block text-[0.75rem] font-medium text-gray-700">Which automations would save you the most time?</label>
        <ToggleChips options={AUTOMATION_OPTIONS} selected={data.automationInterests} onChange={(v) => updateData({ automationInterests: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">What do you want to see first when you open the dashboard?</label>
        <ToggleChips options={DASHBOARD_OPTIONS} selected={data.dashboardPrefs} onChange={(v) => updateData({ dashboardPrefs: v })} />
      </div>
    </div>
  );
}
