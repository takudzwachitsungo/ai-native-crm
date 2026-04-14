import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Check, Pencil } from 'lucide-react';

function ReviewSection({ title, items, onEdit }: { title: string; items: { label: string; value: string }[]; onEdit: () => void }) {
  const filled = items.filter((i) => i.value);
  if (filled.length === 0) return null;
  return (
    <div className="border border-gray-100 rounded-lg px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[0.75rem] font-semibold text-gray-800">{title}</h4>
        <button type="button" onClick={onEdit} className="text-teal-600 hover:text-teal-700 transition-colors">
          <Pencil size={12} />
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {filled.map((item) => (
          <div key={item.label} className="flex items-center gap-1 text-[0.75rem]">
            <Check size={12} className="text-teal-500 shrink-0" />
            <span className="text-gray-500">{item.label}:</span>
            <span className="text-gray-800 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepReview() {
  const { data, goToStep } = useOnboarding();

  return (
    <div className="space-y-2">
      <p className="text-[0.75rem] text-gray-500">Here's a summary of your setup. You can edit any section before launching.</p>

      <ReviewSection
        title="About you"
        onEdit={() => goToStep(0)}
        items={[
          { label: 'Role', value: data.role },
          { label: 'Team size', value: data.teamSize },
          { label: 'Job title', value: data.jobTitle },
        ]}
      />

      <ReviewSection
        title="Company"
        onEdit={() => goToStep(1)}
        items={[
          { label: 'Company', value: data.companyName },
          { label: 'Industry', value: data.industry },
          { label: 'Size', value: data.businessSize },
          { label: 'Country', value: data.country },
        ]}
      />

      <ReviewSection
        title="Sales process"
        onEdit={() => goToStep(2)}
        items={[
          { label: 'Pipeline', value: data.pipelinePreference },
          { label: 'Customers', value: data.customerType },
          { label: 'Deal volume', value: data.expectedDealFlow },
        ]}
      />

      <ReviewSection
        title="Goals"
        onEdit={() => goToStep(3)}
        items={[
          { label: 'CRM goals', value: data.crmGoals.join(', ') },
          { label: 'Priorities', value: data.topPriorities.join(', ') },
        ]}
      />

      <ReviewSection
        title="Team"
        onEdit={() => goToStep(4)}
        items={[
          { label: 'Expected users', value: data.expectedUsers },
          { label: 'Invited', value: data.inviteEmails },
        ]}
      />

      <ReviewSection
        title="Data"
        onEdit={() => goToStep(5)}
        items={[
          { label: 'Import', value: data.importData },
          { label: 'Current tool', value: data.currentTool },
        ]}
      />

      <ReviewSection
        title="Preferences"
        onEdit={() => goToStep(6)}
        items={[
          { label: 'Notifications', value: data.notificationPref },
          { label: 'Automations', value: data.automationInterests.join(', ') },
          { label: 'Dashboard', value: data.dashboardPrefs.join(', ') },
        ]}
      />
    </div>
  );
}
