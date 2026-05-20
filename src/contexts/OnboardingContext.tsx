import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'about-you', title: 'Tell us about you', description: 'Help us personalize your experience.' },
  { id: 'company', title: 'Company details', description: 'So we can tailor your workspace.' },
  { id: 'sales-process', title: 'Sales process', description: 'How your team wins business.' },
  { id: 'goals', title: 'Goals and use case', description: 'What success looks like for you.' },
  { id: 'team', title: 'Team setup', description: 'Who will be working with you?' },
  { id: 'data', title: 'Data and imports', description: 'Bring your existing data along.' },
  { id: 'preferences', title: 'Preferences', description: 'Fine-tune your dashboard and alerts.' },
  { id: 'review', title: 'Review and launch', description: 'Confirm your setup and get started.' },
];

export interface OnboardingData {
  role: string;
  crmExperience: string;
  biggestChallenge: string;
  companyName: string;
  industry: string;
  revenueModel: string;
  companyStage: string;
  salesMotion: string;
  avgDealCycle: string;
  avgDealSize: string;
  crmGoals: string[];
  biggestBottleneck: string;
  expectedUsers: string;
  teamStructure: string;
  inviteEmails: string;
  importData: string;
  currentTool: string;
  dataVolume: string;
  dataQuality: string;
  notificationPref: string;
  automationInterests: string[];
  dashboardPrefs: string[];
}

const DEFAULT_DATA: OnboardingData = {
  role: '',
  crmExperience: '',
  biggestChallenge: '',
  companyName: '',
  industry: '',
  revenueModel: '',
  companyStage: '',
  salesMotion: '',
  avgDealCycle: '',
  avgDealSize: '',
  crmGoals: [],
  biggestBottleneck: '',
  expectedUsers: '',
  teamStructure: '',
  inviteEmails: '',
  importData: '',
  currentTool: '',
  dataVolume: '',
  dataQuality: '',
  notificationPref: '',
  automationInterests: [],
  dashboardPrefs: [],
};

const STORAGE_KEY = 'crm_onboarding';
const STEP_KEY = 'crm_onboarding_step';
const COMPLETE_KEY = 'crm_onboarding_complete';
const PENDING_KEY = 'crm_onboarding_pending';

function scopedKey(scope: string, key: string): string {
  return `${key}:${scope}`;
}

function loadData(scope: string): OnboardingData {
  try {
    const raw = localStorage.getItem(scopedKey(scope, STORAGE_KEY));
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function loadStep(scope: string): number {
  try {
    const raw = localStorage.getItem(scopedKey(scope, STEP_KEY));
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function loadIsComplete(scope: string): boolean {
  const isPending = localStorage.getItem(scopedKey(scope, PENDING_KEY)) === 'true';
  const isComplete = localStorage.getItem(scopedKey(scope, COMPLETE_KEY)) === 'true';
  return isComplete || !isPending;
}

interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  stepConfig: OnboardingStepConfig;
  isComplete: boolean;
  updateData: (partial: Partial<OnboardingData>) => void;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageScope = useMemo(
    () => user?.tenantId && user?.id ? `${user.tenantId}:${user.id}` : 'anonymous',
    [user?.tenantId, user?.id]
  );

  const [data, setData] = useState<OnboardingData>(() => loadData(storageScope));
  const [currentStep, setCurrentStep] = useState<number>(() => loadStep(storageScope));
  const [isComplete, setIsComplete] = useState<boolean>(() => loadIsComplete(storageScope));

  const totalSteps = ONBOARDING_STEPS.length;

  useEffect(() => {
    setData(loadData(storageScope));
    setCurrentStep(loadStep(storageScope));
    setIsComplete(loadIsComplete(storageScope));
  }, [storageScope]);

  useEffect(() => {
    localStorage.setItem(scopedKey(storageScope, STORAGE_KEY), JSON.stringify(data));
  }, [data, storageScope]);

  useEffect(() => {
    localStorage.setItem(scopedKey(storageScope, STEP_KEY), String(currentStep));
  }, [currentStep, storageScope]);

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) setCurrentStep(step);
  }, [totalSteps]);

  const completeOnboarding = useCallback(() => {
    setIsComplete(true);
    localStorage.setItem(scopedKey(storageScope, COMPLETE_KEY), 'true');
    localStorage.removeItem(scopedKey(storageScope, PENDING_KEY));
  }, [storageScope]);

  const resetOnboarding = useCallback(() => {
    setData({ ...DEFAULT_DATA });
    setCurrentStep(0);
    setIsComplete(false);
    localStorage.removeItem(scopedKey(storageScope, STORAGE_KEY));
    localStorage.removeItem(scopedKey(storageScope, STEP_KEY));
    localStorage.removeItem(scopedKey(storageScope, COMPLETE_KEY));
    localStorage.setItem(scopedKey(storageScope, PENDING_KEY), 'true');
  }, [storageScope]);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        currentStep,
        totalSteps,
        stepConfig: ONBOARDING_STEPS[currentStep],
        isComplete,
        updateData,
        goNext,
        goBack,
        goToStep,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
};
