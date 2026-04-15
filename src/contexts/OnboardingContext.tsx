import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Step configuration ───────────────────────────────────────────────
export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { id: 'about-you',       title: 'Tell us about you',      description: 'Help us personalise your experience.' },
  { id: 'company',         title: 'Company details',         description: 'So we can tailor your workspace.' },
  { id: 'sales-process',   title: 'Sales process',           description: 'How your team wins business.' },
  { id: 'goals',           title: 'Goals & use case',        description: 'What success looks like for you.' },
  { id: 'team',            title: 'Team setup',              description: 'Who will be working with you?' },
  { id: 'data',            title: 'Data & imports',          description: 'Bring your existing data along.' },
  { id: 'preferences',     title: 'Preferences',             description: 'Fine-tune your dashboard and alerts.' },
  { id: 'review',          title: 'Review & launch',         description: 'Confirm your setup and get started.' },
];

// ─── Data shape ───────────────────────────────────────────────────────
export interface OnboardingData {
  // Step 1 — about you
  role: string;
  crmExperience: string;
  biggestChallenge: string;
  // Step 2 — company
  companyName: string;
  industry: string;
  revenueModel: string;
  companyStage: string;
  // Step 3 — sales process
  salesMotion: string;
  avgDealCycle: string;
  avgDealSize: string;
  // Step 4 — goals
  crmGoals: string[];
  biggestBottleneck: string;
  // Step 5 — team
  expectedUsers: string;
  teamStructure: string;
  inviteEmails: string;
  // Step 6 — data
  importData: string;
  currentTool: string;
  dataVolume: string;
  dataQuality: string;
  // Step 7 — preferences
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

// ─── Storage helpers ──────────────────────────────────────────────────
const STORAGE_KEY = 'crm_onboarding';
const STEP_KEY = 'crm_onboarding_step';
const COMPLETE_KEY = 'crm_onboarding_complete';

function loadData(): OnboardingData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function loadStep(): number {
  try {
    const raw = localStorage.getItem(STEP_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

// ─── Context ──────────────────────────────────────────────────────────
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
  const [data, setData] = useState<OnboardingData>(loadData);
  const [currentStep, setCurrentStep] = useState<number>(loadStep);
  const [isComplete, setIsComplete] = useState<boolean>(
    () => localStorage.getItem(COMPLETE_KEY) === 'true'
  );

  const totalSteps = ONBOARDING_STEPS.length;

  // Persist data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem(STEP_KEY, String(currentStep));
  }, [currentStep]);

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
    localStorage.setItem(COMPLETE_KEY, 'true');
  }, []);

  const resetOnboarding = useCallback(() => {
    setData({ ...DEFAULT_DATA });
    setCurrentStep(0);
    setIsComplete(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(COMPLETE_KEY);
  }, []);

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
