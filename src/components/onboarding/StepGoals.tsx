import { useOnboarding } from '../../contexts/OnboardingContext';

const GOAL_OPTIONS = [
  'Capture and qualify leads faster',
  'Automate follow-ups and sequences',
  'Forecast revenue accurately',
  'Track team activity and performance',
  'Manage quotes, proposals, and invoices',
  'Run email campaigns and outreach',
  'Handle support cases and tickets',
  'Get AI-powered deal insights',
];

const BOTTLENECK_OPTIONS = [
  'Lead qualification - too many bad leads',
  'Follow-up timing - reps forget or delay',
  'Proposal and negotiation - deals stall here',
  'Handoff between teams - things get lost',
  'Tracking and reporting - no clear visibility',
  'Not sure yet - I need help figuring it out',
];

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

export function StepGoals() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">What should this CRM help you do?</label>
        <p className="text-[0.7rem] text-muted-foreground">Select all that apply.</p>
        <ToggleChips options={GOAL_OPTIONS} selected={data.crmGoals} onChange={(v) => updateData({ crmGoals: v })} />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">Where do deals stall or fall apart most often?</label>
        <p className="text-[0.7rem] text-muted-foreground">This helps us optimize your pipeline.</p>
        <div className="flex flex-wrap gap-1.5">
          {BOTTLENECK_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ biggestBottleneck: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.biggestBottleneck === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
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
