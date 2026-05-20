import { useOnboarding } from '../../contexts/OnboardingContext';

const ROLE_OPTIONS = ['Closing deals daily', 'Managing a sales team', 'Running the business', 'Operations & RevOps', 'Driving marketing & demand gen', 'Supporting customers post-sale'];
const CRM_EXPERIENCE_OPTIONS = ['First time - I\'m new to CRMs', 'Tried one before but it never stuck', 'Yes, I have a clear workflow already', 'Migrating from another CRM'];

export function StepAboutYou() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      {/* Role */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">What best describes your day-to-day?</label>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ role: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.role === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* CRM experience */}
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">Have you used a CRM before?</label>
        <div className="flex flex-wrap gap-1.5">
          {CRM_EXPERIENCE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ crmExperience: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.crmExperience === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Biggest challenge */}
      <div className="space-y-1">
        <label htmlFor="ob-challenge" className="block text-[0.75rem] font-medium text-foreground">What's your biggest frustration managing customer relationships right now?</label>
        <input
          id="ob-challenge"
          type="text"
          value={data.biggestChallenge}
          onChange={(e) => updateData({ biggestChallenge: e.target.value })}
          placeholder="e.g. Leads fall through the cracks, no visibility into pipeline"
          className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[0.8125rem] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-gray-300 transition-all duration-150"
        />
      </div>
    </div>
  );
}
