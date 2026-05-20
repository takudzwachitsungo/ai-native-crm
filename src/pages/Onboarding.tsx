import { useNavigate } from 'react-router-dom';
import type React from 'react';
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
import { Icons } from '../components/icons';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed top-0 left-0 right-0 z-20 h-1 bg-border">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto flex min-h-app w-full max-w-6xl flex-col px-3 py-5 sm:px-4 sm:py-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icons.LogoSmall />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Cicosy CRM</p>
              <p className="text-xs text-muted-foreground">Workspace setup</p>
            </div>
          </div>
          <span className="text-[0.75rem] font-medium text-muted-foreground tabular-nums">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-5 sm:py-8">
          <div className="grid w-full max-w-[1040px] overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-gray-900/10 lg:grid-cols-[260px_1fr]">
            <aside className="hidden border-r border-border bg-secondary/40 p-5 lg:block">
              <div className="space-y-1">
                {ONBOARDING_STEPS.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[0.78rem] transition-colors ${
                      idx === currentStep
                        ? 'bg-card text-primary shadow-sm'
                        : idx < currentStep
                          ? 'text-foreground hover:bg-card/70'
                          : 'text-muted-foreground'
                    }`}
                    disabled={idx > currentStep}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.68rem] font-semibold ${
                      idx <= currentStep ? 'bg-primary text-white' : 'bg-border text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex min-h-[calc(100dvh-9rem)] flex-col sm:min-h-[560px]">
              <div className="border-b border-border px-6 py-6 sm:px-8">
                <h1 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
                  {stepConfig.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{stepConfig.description}</p>
                {isFirst && user && (
                  <p className="mt-3 text-[0.8125rem] font-medium text-primary">
                    Welcome, {user.firstName}. Let's tailor the CRM to your team.
                  </p>
                )}
              </div>

              <div className="px-6 pt-4 sm:px-8 lg:hidden">
                <div className="flex gap-1.5">
                  {ONBOARDING_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                        idx <= currentStep ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                <StepComponent />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/40 px-6 py-4 sm:px-8 sm:py-5">
                {!isFirst ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                    className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-[0.875rem] font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
                  >
                    Launch workspace
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-[0.875rem] font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
                  >
                    Continue <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>

        <div className="pb-4 text-center">
          <button
            type="button"
            onClick={handleFinish}
            className="text-[0.75rem] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Skip setup for now
          </button>
        </div>
      </div>
    </div>
  );
}
