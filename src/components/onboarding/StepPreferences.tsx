import { useOnboarding } from '../../contexts/OnboardingContext';

const NOTIFICATION_OPTIONS = ['Real-time notifications', 'Smart digest - important items only', 'Minimal - assignments and mentions', 'Quiet - I will check manually'];
const AUTOMATION_OPTIONS = ['Auto-score and prioritize leads', 'Follow-up reminders when deals go cold', 'Deal stage progression alerts', 'SLA escalation for support tickets', 'Email sequences and drip campaigns', 'Round-robin lead assignment'];
const DASHBOARD_OPTIONS = ['Live pipeline overview', 'Revenue forecast and trends', 'Team activity leaderboard', 'Win/loss analysis', 'AI-powered deal insights', 'Campaign ROI metrics'];

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
              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
              : 'border-border bg-card text-foreground hover:border-gray-300'
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
        <label className="block text-[0.75rem] font-medium text-foreground">How do you want to be notified?</label>
        <div className="flex flex-wrap gap-1.5">
          {NOTIFICATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ notificationPref: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.notificationPref === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">Which automations would save you the most time?</label>
        <ToggleChips options={AUTOMATION_OPTIONS} selected={data.automationInterests} onChange={(v) => updateData({ automationInterests: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">What do you want to see first when you open the dashboard?</label>
        <ToggleChips options={DASHBOARD_OPTIONS} selected={data.dashboardPrefs} onChange={(v) => updateData({ dashboardPrefs: v })} />
      </div>
    </div>
  );
}
