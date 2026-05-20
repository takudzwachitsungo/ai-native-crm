import { useOnboarding } from '../../contexts/OnboardingContext';
import { Upload, Database, BarChart3, Sparkles } from 'lucide-react';

const IMPORT_OPTIONS = ['Yes, I have data ready to import', "Not right now - I'll start fresh", 'Maybe later - I need to clean it first'];
const TOOL_OPTIONS = ['Spreadsheets (Excel / Google Sheets)', 'Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive', 'Monday.com / Notion', 'Another CRM', 'No existing tool'];
const DATA_VOLUME_OPTIONS = ['Less than 500 records', '500-5,000', '5,000-50,000', '50,000+'];
const DATA_QUALITY_OPTIONS = ['Pretty clean - mostly organized', 'Needs some cleanup', "It's a mess - help me sort it out"];

export function StepData() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-foreground">
          <span className="flex items-center gap-1.5"><Upload size={14} /> Do you have existing contacts or deals to bring in?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {IMPORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ importData: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.importData === opt
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
          <span className="flex items-center gap-1.5"><Database size={14} /> What tool are you using today?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOOL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ currentTool: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.currentTool === opt
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card text-foreground hover:border-gray-300'
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {data.importData === 'Yes, I have data ready to import' && (
        <>
          <div className="space-y-1.5">
            <label className="block text-[0.75rem] font-medium text-foreground">
              <span className="flex items-center gap-1.5"><BarChart3 size={14} /> Roughly how many records are we talking?</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DATA_VOLUME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateData({ dataVolume: opt })}
                  className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                    ${data.dataVolume === opt
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
              <span className="flex items-center gap-1.5"><Sparkles size={14} /> How clean is your data?</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DATA_QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateData({ dataQuality: opt })}
                  className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                    ${data.dataQuality === opt
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card text-foreground hover:border-gray-300'
                    }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
