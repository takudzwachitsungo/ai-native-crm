import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Upload, Database } from 'lucide-react';

const IMPORT_OPTIONS = ['Yes, I have data to import', "Not right now — I'll start fresh", 'Maybe later'];
const TOOL_OPTIONS = ['Spreadsheets (Excel/CSV)', 'Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive', 'Another CRM', 'No existing tool'];

export function StepData() {
  const { data, updateData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[0.75rem] font-medium text-gray-700">
          <span className="flex items-center gap-1.5"><Upload size={14} /> Want to import existing contacts or leads?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {IMPORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ importData: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.importData === opt
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
          <span className="flex items-center gap-1.5"><Database size={14} /> What are you using today?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TOOL_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => updateData({ currentTool: opt })}
              className={`px-3 py-1 rounded-full border text-[0.75rem] transition-all duration-150
                ${data.currentTool === opt
                  ? 'border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500/30'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
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
