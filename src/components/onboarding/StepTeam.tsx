import { useOnboarding } from '../../contexts/OnboardingContext';
import { Users, Mail, Network } from 'lucide-react';

const USER_COUNT_OPTIONS = ['Just me', '2-5', '6-20', '21-50', '50+'];
const TEAM_STRUCTURE_OPTIONS = ['Flat - everyone does everything', 'By territory or region', 'By product line or segment', 'SDR to AE to CSM handoff', 'Individual contributor (solo)'];

export function StepTeam() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">
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
        <label className="block text-[0.75rem] font-medium text-foreground">
          <span className="flex items-center gap-1.5"><Network size={14} /> How is your sales team organized?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TEAM_STRUCTURE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ teamStructure: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.teamStructure === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="ob-invite" className="block text-[0.75rem] font-medium text-foreground">
          <span className="flex items-center gap-1.5"><Mail size={14} /> Invite teammates to get started together</span>
        </label>
        <textarea
          id="ob-invite"
          rows={2}
          value={data.inviteEmails}
          onChange={(e) => updateData({ inviteEmails: e.target.value })}
          placeholder="jane@company.com, mark@company.com"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-[0.8125rem] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-gray-300 transition-all duration-150 resize-none"
        />
        <p className="text-[0.7rem] text-muted-foreground">Comma-separated emails. You can always add more later.</p>
      </div>
    </div>
  );
}
