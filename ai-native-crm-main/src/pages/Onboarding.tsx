import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding, ONBOARDING_STEPS } from '../contexts/OnboardingContext';
import { useAuth } from '../contexts/AuthContext';
import { StepAboutYou } from '../components/onboarding/StepAboutYou';
import { StepCompany } from '../components/onboarding/StepCompany';
import { StepSalesProcess } from '../components/onboarding/StepSalesProcess';
import { StepGoals } from '../components/onboarding/StepGoals';
import { StepTeam } from '../components/onboarding/StepTeam';
import { StepData } from '../components/onboarding/StepData';
import { StepPreferences } from '../components/onboarding/StepPreferences';
import { StepReview } from '../components/onboarding/StepReview';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';

const STEP_COMPONENTS: React.FC[] = [
  StepAboutYou,
  StepCompany,
  StepSalesProcess,
  StepGoals,
  StepTeam,
  StepData,
  StepPreferences,
  StepReview,
];

export default function Onboarding() {
  const { currentStep, totalSteps, stepConfig, goNext, goBack, completeOnboarding } = useOnboarding();
  const { user } = useAuth();
  const navigate = useNavigate();

  const StepComponent = STEP_COMPONENTS[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleFinish = () => {
    completeOnboarding();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

      {/* Progress bar — full width at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200/50">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Wizard card */}
      <div className="relative z-10 w-full max-w-[1020px] mx-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-gray-800 font-semibold text-sm">NativeCRM</span>
            </div>
            <span className="text-[0.75rem] font-medium text-gray-400 tabular-nums">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/[0.04] border border-gray-100 overflow-hidden">
            {/* Step header */}
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-[1.25rem] font-semibold text-gray-900 tracking-tight">
                {stepConfig.title}
              </h2>
              <p className="mt-1 text-[0.875rem] text-gray-500">{stepConfig.description}</p>
              {isFirst && user && (
                <p className="mt-2 text-[0.8125rem] text-teal-700 font-medium">
                  Welcome, {user.firstName}! Let's tailor the CRM to your team.
                </p>
              )}
            </div>

            {/* Step dots */}
            <div className="px-8 pt-3 pb-5">
              <div className="flex gap-1.5">
                {ONBOARDING_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                      idx < currentStep
                        ? 'bg-teal-500'
                        : idx === currentStep
                          ? 'bg-teal-400'
                          : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="px-8 pb-6 min-h-[280px]">
              <StepComponent />
            </div>

            {/* Navigation */}
            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              {!isFirst ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={15} /> Back
                </button>
              ) : (
                <div />
              )}

              {isLast ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-[0.875rem] text-white bg-gradient-to-b from-[#0f766e] to-[#0d6b64] hover:from-[#0d6b64] hover:to-[#0b5f59] shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 transition-all duration-150"
                >
                  <Rocket size={15} /> Launch workspace
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-medium text-[0.875rem] text-white bg-gradient-to-b from-[#0f766e] to-[#0d6b64] hover:from-[#0d6b64] hover:to-[#0b5f59] shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 transition-all duration-150"
                >
                  Continue <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Skip link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleFinish}
              className="text-[0.75rem] text-white/70 hover:text-white transition-colors"
            >
              Skip setup and go to dashboard
            </button>
          </div>
        </div>
    </div>
  );
}
