import { useOnboarding } from '../../contexts/OnboardingContext';

const INDUSTRIES = ['SaaS & Cloud Software', 'Financial Services & Fintech', 'Agency & Consulting', 'E-commerce & DTC', 'Healthcare & Life Sciences', 'Construction & Real Estate', 'Manufacturing & Supply Chain', 'Education & EdTech', 'Media & Publishing', 'Other'];
const REVENUE_MODELS = ['Subscriptions / Recurring', 'One-time sales', 'Project-based / Retainers', 'Usage-based / Metered', 'Mixed / Marketplace'];
const COMPANY_STAGES = ['Pre-revenue / Just starting', 'Early traction (< $1M ARR)', 'Growth stage ($1M-$10M)', 'Scaling ($10M-$50M)', 'Enterprise ($50M+)'];

export function StepCompany() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="ob-company" className="block text-[0.75rem] font-medium text-foreground">Company name</label>
        <input
          id="ob-company"
          type="text"
          value={data.companyName}
          onChange={(e) => updateData({ companyName: e.target.value })}
          placeholder="Acme Inc."
          className="w-full h-10 px-3 rounded-lg border border-border bg-card text-[0.8125rem] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-gray-300 transition-all duration-150"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">What industry are you in?</label>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ industry: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.industry === opt
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
        <label className="block text-[0.75rem] font-medium text-foreground">How do you generate revenue?</label>
        <div className="flex flex-wrap gap-1.5">
          {REVENUE_MODELS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ revenueModel: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.revenueModel === opt
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
        <label className="block text-[0.75rem] font-medium text-foreground">Where is your company right now?</label>
        <div className="flex flex-wrap gap-1.5">
          {COMPANY_STAGES.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ companyStage: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.companyStage === opt
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
