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


const testimonials = [
  {
    quote: 'This CRM completely transformed how our sales team operates. Lead scoring alone saved us hours every week — and forecasting finally feels accurate.',
    name: 'Marcus Osei',
    company: 'TechBridge Africa',
    role: 'Revenue Operations Lead',
  },
  {
    quote: 'The AI assistant surfaces insights I used to spend hours digging for. My pipeline has never been healthier and I close deals faster than ever before.',
    name: 'Amara Nwosu',
    company: 'Novo Ventures',
    role: 'Senior Account Executive',
  },
  {
    quote: 'From onboarding to our first closed deal in the system, it took less than a day. The workspace setup is genuinely the smoothest I have ever experienced.',
    name: 'David Chikwanda',
    company: 'Meridian Growth Partners',
    role: 'Sales Director',
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
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const prevTestimonial = () =>
    setTestimonialIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const nextTestimonial = () =>
    setTestimonialIndex((i) => (i + 1) % testimonials.length);

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
    setStepDirection('forward');
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
    setStepDirection('forward');
    setSignupStep((current) => Math.min(current + 1, signupSteps.length - 1));
  };

  const handlePreviousStep = () => {
    setError('');
    setStepDirection('backward');
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
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_35%),linear-gradient(135deg,_#f6fbfc_0%,_#eef4f7_42%,_#f8fbfd_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-white/80 bg-white/82 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur">
        <section className="relative hidden w-[38%] overflow-hidden bg-[linear-gradient(160deg,_#0b2233_0%,_#0f3347_45%,_#1a5f6b_100%)] p-5 text-white lg:flex lg:flex-col">
          {/* Subtle radial overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(103,232,249,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.06),_transparent_45%)]" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Icons.LogoSmall />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/70">AI Native CRM</p>
              <p className="text-[13px] font-semibold leading-tight">Sales workspace</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="relative z-10 mt-6 max-w-[17rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">Calmer onboarding</p>
            <h1 className="mt-2 text-[2rem] font-light leading-[1.12] tracking-[-0.02em]">
              Set up your sales workspace now
            </h1>
            <p className="mt-4 text-[12px]  leading[1.6] text-slate-300/80">
              A guided experience that gets your team from sign-up to first pipeline in minutes — no overwhelming setup, just clarity.
            </p>
          </div>

          {/* Testimonial card */}
          <div className="relative z-10 mt-auto">
            <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-[12.5px] leading-[1.6] text-white/90">
                &ldquo;{testimonials[testimonialIndex].quote}&rdquo;
              </p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold leading-tight text-white">{testimonials[testimonialIndex].name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-cyan-200/80">{testimonials[testimonialIndex].company}</p>
                  <p className="text-[10.5px] text-white/50">{testimonials[testimonialIndex].role}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={prevTestimonial}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                    aria-label="Previous testimonial"
                  >
                    <Icons.ArrowLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={nextTestimonial}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                    aria-label="Next testimonial"
                  >
                    <Icons.ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        <section className="flex flex-1 items-center justify-center px-5 py-5 sm:px-5 lg:px-6">
          <div className="w-full max-w-[500px]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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

            <div className="flex h-[560px] flex-col rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
              {mode === 'login' ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-700/80">
                      Welcome back
                    </p>
                    <h2 className="mt-1 text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[1.25rem]">
                      Sign in to your workspace
                    </h2>
                    <p className="mt-1 max-w-md text-[11px] leading-[1.4] text-slate-500">
                      Use your company credentials to pick up where your team left off.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  key={`signup-shell-${signupStep}`}
                  className={cn(
                    'auth-step-shell -m-0.5 flex h-[100px] flex-col rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.96)_100%)] p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)]',
                    stepDirection === 'forward' ? 'auth-step-shell-forward' : 'auth-step-shell-backward'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-700/80">
                        Step {signupStep + 1} of {signupSteps.length}
                      </p>
                      <h2 className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[1.15rem]">
                        {activeStep.title}
                      </h2>
                      <p className="mt-0.5 max-w-md text-[10px] leading-[1.3] text-slate-500">{activeStep.hint}</p>
                    </div>


                  </div>

                  <div className="mt-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,_#0f766e_0%,_#0891b2_100%)] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                  </div>
                </div>
              )}

              <form
                key={mode === 'signup' ? `signup-form-${signupStep}` : 'login-form'}
                className={cn(
                  'mt-2 flex flex-1 flex-col',
                  mode === 'signup' &&
                  'auth-step-shell auth-step-shell-soft min-h-[248px] rounded-[18px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.94)_100%)] p-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]',
                  mode === 'signup' && (stepDirection === 'forward' ? 'auth-step-shell-forward' : 'auth-step-shell-backward')
                )}
                onSubmit={handleSubmit}
              >
                {error && (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </div>
                )}

                <div className={cn('pr-1', mode === 'signup' && 'flex-1')}>
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
                    <div className="auth-step-panel flex min-h-[170px] flex-col justify-start space-y-1.5">
                      {signupStep === 0 && (
                        <div className="space-y-2">
                          <div className="rounded-[12px] border border-cyan-100 bg-[linear-gradient(180deg,_#f5fdff_0%,_#ffffff_100%)] px-2 py-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-700/80">
                              Step 1
                            </p>
                            <h3 className="mt-0.5 text-[13px] font-semibold text-slate-900">Choose the admin email</h3>
                            <p className="mt-0.5 text-[10px] leading-[1.3] text-slate-500">
                              This becomes the primary sign-in for the workspace you are setting up.
                            </p>
                          </div>

                          <AuthField
                            id="signup-email"
                            label="Work email"
                            type="email"
                            value={formData.email}
                            onChange={updateField('email')}
                            placeholder="you@company.com"
                            autoComplete="email"
                          />

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                            <p className="text-xs font-medium text-slate-800">What happens next?</p>
                            <p className="mt-1 text-[10px] leading-[1.05rem] text-slate-500">
                              After this, we will collect the admin name and password on a separate step before creating the workspace.
                            </p>
                          </div>
                        </div>
                      )}

                      {signupStep === 1 && (
                        <div className="space-y-2">
                          <div className="rounded-[12px] border border-cyan-100 bg-[linear-gradient(180deg,_#f5fdff_0%,_#ffffff_100%)] px-2 py-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-700/80">
                              Step 2
                            </p>
                            <h3 className="mt-0.5 text-[13px] font-semibold text-slate-900">Set up the admin profile</h3>
                            <p className="mt-0.5 text-[10px] leading-[1.3] text-slate-500">
                              This screen is only about the person creating the account, so it stays focused and easy to complete.
                            </p>
                          </div>

                          <div className="grid gap-1.5 sm:grid-cols-2">
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
                        </div>
                      )}

                      {signupStep === 2 && (
                        <div className="space-y-2">
                          <div className="rounded-[12px] border border-cyan-100 bg-[linear-gradient(180deg,_#f5fdff_0%,_#ffffff_100%)] px-2 py-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-700/80">
                              Step 3
                            </p>
                            <h3 className="mt-0.5 text-[13px] font-semibold text-slate-900">Create the workspace</h3>
                            <p className="mt-0.5 text-[10px] leading-[1.3] text-slate-500">
                              Name the company account, then review the details that will be used for the first CRM workspace.
                            </p>
                          </div>

                          <AuthField
                            id="companyName"
                            label="Company name"
                            value={formData.companyName}
                            onChange={updateField('companyName')}
                            placeholder="Acme Growth Partners"
                            autoComplete="organization"
                          />

                          <div className="rounded-[14px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] p-1.5">
                            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Review</p>
                            <div className="mt-1.5 space-y-1">
                              {signupPreview.map((item) => (
                                <div
                                  key={item.label}
                                  className="flex items-start justify-between gap-3 rounded-xl bg-white px-2 py-1.5"
                                >
                                  <span className="text-[11px] text-slate-500">{item.label}</span>
                                  <span className="max-w-[58%] break-words text-right text-[11px] font-medium text-slate-900">
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

                <div className="mt-2 space-y-2 border-t border-slate-100 pt-2.5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
      flex items-center justify-center
      mx-auto
      w-auto
      px-5 py-2
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
                    <div className="flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={handlePreviousStep}
                        disabled={signupStep === 0 || isLoading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
