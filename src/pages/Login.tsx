import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Icons } from '../components/icons';

type AuthMode = 'login' | 'signup';

interface SignupStepDefinition {
  id: string;
  title: string;
  hint: string;
}

const signupSteps: SignupStepDefinition[] = [
  {
    id: 'contact',
    title: 'Start with your work email',
    hint: 'We will use this to create your secure workspace sign-in.',
  },
  {
    id: 'profile',
    title: 'Tell us who is setting things up',
    hint: 'A few details now make the rest of the onboarding feel personal.',
  },
  {
    id: 'workspace',
    title: 'Name your company workspace',
    hint: 'This creates the company account where your CRM data will live.',
  },
];

const spotlightCards = [
  {
    label: 'Faster onboarding',
    title: 'Guide people one decision at a time',
    description: 'A calmer setup flow makes it easier for new teams to trust the product from the first screen.',
  },
  {
    label: 'Built for sales teams',
    title: 'From first sign-in to first pipeline',
    description: 'The platform is designed to get leads, deals, contacts, and forecasting ready without overwhelming users.',
  },
  {
    label: 'AI in the workflow',
    title: 'Insights feel useful when the basics feel simple',
    description: 'A cleaner auth journey sets up the rest of the product to feel focused and premium.',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNestedString(source: unknown, keys: string[]): string | undefined {
  let current: unknown = source;

  for (const key of keys) {
    if (!isRecord(current) || typeof current[key] === 'undefined') {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : undefined;
}

function readNestedNumber(source: unknown, keys: string[]): number | undefined {
  let current: unknown = source;

  for (const key of keys) {
    if (!isRecord(current) || typeof current[key] === 'undefined') {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === 'number' ? current : undefined;
}

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const progress = ((signupStep + 1) / signupSteps.length) * 100;
  const activeStep = signupSteps[signupStep];

  const signupPreview = useMemo(
    () => [
      { label: 'Admin name', value: `${formData.firstName} ${formData.lastName}`.trim() || 'Not added yet' },
      { label: 'Work email', value: formData.email || 'Not added yet' },
      { label: 'Company workspace', value: formData.companyName || 'Not added yet' },
    ],
    [formData.companyName, formData.email, formData.firstName, formData.lastName]
  );

  const updateField =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((current) => ({ ...current, [field]: e.target.value }));
    };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setSignupStep(0);
  };

  const getFriendlyError = (err: unknown) => {
    const errorMessage =
      readNestedString(err, ['response', 'data', 'message']) || 'Authentication failed. Please try again.';
    const statusCode = readNestedNumber(err, ['response', 'status']);

    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return 'This email is already registered. Please sign in instead or use a different email.';
    }
    if (statusCode === 401) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }

    return errorMessage;
  };

  const validateSignupStep = () => {
    if (signupStep === 0) {
      if (!formData.email.trim()) return 'Enter your work email to continue.';
      if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address.';
    }

    if (signupStep === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        return 'Add your first and last name so we know who owns this workspace.';
      }
      if (formData.password.length < 8) {
        return 'Choose a password with at least 8 characters.';
      }
    }

    if (signupStep === 2 && !formData.companyName.trim()) {
      return 'Enter your company name to create the workspace.';
    }

    return '';
  };

  const handleNextStep = () => {
    const validationError = validateSignupStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSignupStep((current) => Math.min(current + 1, signupSteps.length - 1));
  };

  const handlePreviousStep = () => {
    setError('');
    setSignupStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && signupStep < signupSteps.length - 1) {
      handleNextStep();
      return;
    }

    if (mode === 'signup') {
      const validationError = validateSignupStep();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
        });
      }

      navigate('/');
    } catch (err: unknown) {
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_35%),linear-gradient(135deg,_#f6fbfc_0%,_#eef4f7_42%,_#f8fbfd_100%)] px-3 py-4 text-slate-900 sm:px-5 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[26px] border border-white/70 bg-white/75 shadow-[0_18px_56px_rgba(15,23,42,0.1)] backdrop-blur md:min-h-[640px] lg:h-[760px] lg:min-h-0">
        <section className="relative hidden w-[42%] overflow-hidden bg-[linear-gradient(160deg,_#0f2d40_0%,_#123f56_48%,_#1f6b73_100%)] p-6 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_30%)]" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
              <Icons.LogoSmall />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/75">AI Native CRM</p>
              <p className="text-base font-semibold">Sales workspace</p>
            </div>
          </div>

          <div className="relative z-10 mt-7 max-w-[19rem]">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">Calmer onboarding</p>
            <h1
              className="text-3xl md:text-4xl lg:text-[10 rem] leading-tight font-serif-sans"
             
            >
              Make the first five minutes feel confident.
            </h1>
            <p className="mt-3 text-[13px] leading-5 text-slate-200">
              A guided sign-up experience helps teams move from curiosity to setup without dumping every field onto one screen.
            </p>
          </div>

          <div className="relative z-10 mt-auto space-y-3">
            {spotlightCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100/70">{card.label}</p>
                <h2 className="mt-1.5 text-[15px] font-semibold leading-snug">{card.title}</h2>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-200">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full max-w-[560px]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-0.5">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                    mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                    mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  Sign up
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Secure access for your workspace' : 'New company setup takes under two minutes'}
              </p>
            </div>

            <div className="flex flex-col rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-5 lg:h-[655px]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-700/80">
                    {mode === 'login' ? 'Welcome back' : `Step ${signupStep + 1} of ${signupSteps.length}`}
                  </p>
                  <h2 className="mt-2 font-semibold tracking-tight text-slate-900 m:text-[2.15rem]">
                    {mode === 'login' ? 'Sign in to your workspace' : activeStep.title}
                  </h2>
                  <p className="mt-2 max-w-md text-[13px] leading-5 text-slate-500">
                    {mode === 'login'
                      ? 'Use your company credentials to pick up where your team left off.'
                      : activeStep.hint}
                  </p>
                </div>

                {mode === 'signup' && (
                  <div className="hidden min-w-[90px] rounded-xl bg-slate-50 p-2 text-right sm:block">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Progress</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{Math.round(progress)}%</p>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div className="mt-3.5">
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,_#0f766e_0%,_#0891b2_100%)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    {signupSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={cn(
                          'rounded-xl border p-2 transition-all',
                          index === signupStep
                            ? 'border-cyan-200 bg-cyan-50'
                            : index < signupStep
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                              index < signupStep
                                ? 'bg-emerald-600 text-white'
                                : index === signupStep
                                  ? 'bg-cyan-700 text-white'
                                  : 'bg-white text-slate-500 ring-1 ring-slate-200'
                            )}
                          >
                            {index < signupStep ? <Icons.CheckCircle size={12} /> : index + 1}
                          </div>
                          <p className="text-[11px] font-medium leading-5 text-slate-800">{step.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form className="mt-4 flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {mode === 'login' ? (
                    <div className="space-y-3">
                      <AuthField
                        id="email"
                        label="Work email"
                        type="email"
                        value={formData.email}
                        onChange={updateField('email')}
                        placeholder="name@company.com"
                        autoComplete="email"
                      />

                      <AuthField
                        id="password"
                        label="Password"
                        type="password"
                        value={formData.password}
                        onChange={updateField('password')}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signupStep === 0 && (
                        <div className="space-y-3">
                          <AuthField
                            id="signup-email"
                            label="Work email"
                            type="email"
                            value={formData.email}
                            onChange={updateField('email')}
                            placeholder="you@company.com"
                            autoComplete="email"
                          />

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-800">What happens next?</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                              We will use your email as the primary admin login for the new CRM workspace.
                            </p>
                          </div>
                        </div>
                      )}

                      {signupStep === 1 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <AuthField
                            id="firstName"
                            label="First name"
                            value={formData.firstName}
                            onChange={updateField('firstName')}
                            placeholder="Tawanda"
                            autoComplete="given-name"
                          />
                          <AuthField
                            id="lastName"
                            label="Last name"
                            value={formData.lastName}
                            onChange={updateField('lastName')}
                            placeholder="Ncube"
                            autoComplete="family-name"
                          />
                          <div className="sm:col-span-2">
                            <AuthField
                              id="signup-password"
                              label="Create password"
                              type="password"
                              value={formData.password}
                              onChange={updateField('password')}
                              placeholder="At least 8 characters"
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                      )}

                      {signupStep === 2 && (
                        <div className="space-y-3">
                          <AuthField
                            id="companyName"
                            label="Company name"
                            value={formData.companyName}
                            onChange={updateField('companyName')}
                            placeholder="Acme Growth Partners"
                            autoComplete="organization"
                          />

                          <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Review</p>
                            <div className="mt-2 space-y-2">
                              {signupPreview.map((item) => (
                                <div
                                  key={item.label}
                                  className="flex items-start justify-between gap-4 rounded-xl bg-white px-3 py-2"
                                >
                                  <span className="text-[11px] text-slate-500">{item.label}</span>
                                  <span className="max-w-[58%] text-right text-[11px] font-medium text-slate-900 break-words">
                                    {item.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-3 border-t border-slate-100 pt-4">
  <button
    type="submit"
    disabled={isLoading}
    className="
      flex items-center justify-center
      mx-auto
      w-auto
      px-6 py-2.5
      text-sm font-semibold
      rounded-lg
      bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_55%,_#0f766e_100%)]
      text-white
      shadow-md hover:shadow-lg
      transition-all duration-200
      hover:scale-[1.02]
      disabled:cursor-not-allowed disabled:opacity-60
    "
  >
    {isLoading
      ? 'Please wait...'
      : mode === 'login'
        ? 'Sign in'
        : signupStep === signupSteps.length - 1
          ? 'Create workspace'
          : 'Continue'}
  </button>
                  {mode === 'signup' && (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handlePreviousStep}
                        disabled={signupStep === 0 || isLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Icons.ArrowLeft size={16} />
                        Back
                      </button>

                      <p className="text-[11px] text-slate-500">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>
                  )}

                  {mode === 'login' && (
                    <p className="text-center text-[11px] text-slate-500">
                      Need a new company account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Start sign up
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}

function AuthField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: AuthFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  );
}
