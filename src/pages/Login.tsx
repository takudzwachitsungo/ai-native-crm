import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Icons } from '../components/icons';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 8;

const GOALS = [
  { id: 'leads', label: 'Manage leads', desc: 'Track and qualify your prospects', emoji: '🎯' },
  { id: 'websites', label: 'Build websites', desc: 'Launch landing pages and forms', emoji: '🌐' },
  { id: 'automate', label: 'Automate workflows', desc: 'Save time with smart automation', emoji: '⚡' },
  { id: 'data', label: 'Collect data / forms', desc: 'Capture leads from any source', emoji: '📊' },
];

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: '$0', period: '/month',
    tagline: 'Perfect for getting started',
    features: ['Up to 500 leads', 'Basic pipeline', 'Email support'],
    recommended: false,
  },
  {
    id: 'pro', name: 'Pro', price: '$49', period: '/month',
    tagline: 'Everything your sales team needs',
    features: ['Unlimited leads', 'AI lead scoring', 'Full pipeline', 'Chat + forecasting'],
    recommended: true,
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$149', period: '/month',
    tagline: 'For large and complex organisations',
    features: ['Everything in Pro', 'Custom integrations', 'Dedicated account manager'],
    recommended: false,
  },
];

const SUPPORT_OPTIONS = [
  { id: 'email', label: 'Email support', desc: 'Responses within 24 hours', emoji: '📧' },
  { id: 'chat', label: 'Live chat', desc: 'Real-time help during business hours', emoji: '💬' },
  { id: 'dedicated', label: 'Dedicated manager', desc: 'A personal success manager', emoji: '🤝' },
];

const INDUSTRIES = ['SaaS / Software', 'Real Estate', 'Finance', 'Healthcare', 'Retail', 'Consulting', 'Other'];
const TEAM_SIZES = ['Solo', '2–10', '11–50', '51–200', '200+'];

const testimonials = [
  {
    quote: 'This CRM completely transformed how our sales team operates. Lead scoring alone saved us hours every week — and forecasting finally feels accurate.',
    name: 'Marcus Osei', company: 'TechBridge Africa', role: 'Revenue Operations Lead',
  },
  {
    quote: 'The AI assistant surfaces insights I used to spend hours digging for. My pipeline has never been healthier and I close deals faster than ever before.',
    name: 'Amara Nwosu', company: 'Novo Ventures', role: 'Senior Account Executive',
  },
  {
    quote: 'From onboarding to our first closed deal in the system, it took less than a day. The workspace setup is genuinely the smoothest I have ever experienced.',
    name: 'David Chikwanda', company: 'Meridian Growth Partners', role: 'Sales Director',
  },
];

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface OnboardingData {
  firstName: string; lastName: string; email: string; password: string;
  companyName: string; industry: string; teamSize: string;
  phone: string; otpSent: boolean; otpCode: string;
  goals: string[];
  selectedPlan: string;
  cardName: string; cardNumber: string; cardExpiry: string; cardCvv: string;
  supportType: string;
  jobTitle: string; bio: string;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function nestedStr(src: unknown, keys: string[]): string | undefined {
  let c: unknown = src;
  for (const k of keys) { if (!isRec(c) || c[k] === undefined) return undefined; c = c[k]; }
  return typeof c === 'string' ? c : undefined;
}
function nestedNum(src: unknown, keys: string[]): number | undefined {
  let c: unknown = src;
  for (const k of keys) { if (!isRec(c) || c[k] === undefined) return undefined; c = c[k]; }
  return typeof c === 'number' ? c : undefined;
}
function friendlyError(err: unknown): string {
  const msg = nestedStr(err, ['response', 'data', 'message']) ?? 'Authentication failed. Please try again.';
  const status = nestedNum(err, ['response', 'status']);
  if (msg.includes('already exists') || msg.includes('duplicate'))
    return 'This email is already registered. Please sign in instead.';
  if (status === 401) return 'Invalid email or password. Please try again.';
  return msg;
}

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────────────

function Field({
  id, label, value, onChange, placeholder, type = 'text', autoComplete,
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; type?: string; autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-slate-600">{label}</span>
      <input
        id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete} required
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  );
}

function SelectField({
  id, label, value, onChange, options, placeholder,
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[]; placeholder: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[11.5px] font-medium text-slate-600">{label}</span>
      <select
        id={id} value={value} onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-700/80">
        Step {step} of {TOTAL_STEPS}
      </p>
      <h2 className="mt-1 text-[1.3rem] font-semibold tracking-[-0.02em] text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-[12px] leading-[1.5] text-slate-500">{subtitle}</p>}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] text-red-700">
      {msg}
    </div>
  );
}

function PrimaryBtn({
  onClick, disabled, isLoading, children, fullWidth = true,
}: {
  onClick?: () => void; disabled?: boolean; isLoading?: boolean;
  children: React.ReactNode; fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white',
        'bg-[linear-gradient(135deg,_#0f172a_0%,_#1e293b_55%,_#0f766e_100%)]',
        'shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
        'disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : 'w-auto',
      )}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Please wait…
        </>
      ) : children}
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward');
  const [data, setData] = useState<OnboardingData>({
    firstName: '', lastName: '', email: '', password: '',
    companyName: '', industry: '', teamSize: '',
    phone: '', otpSent: false, otpCode: '',
    goals: [], selectedPlan: 'pro',
    cardName: '', cardNumber: '', cardExpiry: '', cardCvv: '',
    supportType: '', jobTitle: '', bio: '',
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  // ─ helpers ─
  const setField = (field: keyof OnboardingData, value: unknown) =>
    setData(prev => ({ ...prev, [field]: value }));

  const fieldSetter = (field: keyof OnboardingData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setField(field, e.target.value);

  const goForward = () => { setError(''); setSlideDir('forward'); setStep(s => s + 1); };
  const goBack = () => { setError(''); setSlideDir('backward'); setStep(s => s - 1); };
  const switchMode = (m: 'login' | 'signup') => { setMode(m); setStep(0); setError(''); };

  const toggleGoal = (id: string) =>
    setData(prev => ({
      ...prev,
      goals: prev.goals.includes(id) ? prev.goals.filter(g => g !== id) : [...prev.goals, id],
    }));

  // ─ validation ─
  const validate = (): string => {
    switch (step) {
      case 1:
        if (!data.firstName.trim() || !data.lastName.trim()) return 'Please enter your first and last name.';
        if (!/\S+@\S+\.\S+/.test(data.email)) return 'Please enter a valid email address.';
        if (data.password.length < 8) return 'Password must be at least 8 characters.';
        return '';
      case 2:
        if (!data.companyName.trim()) return 'Please enter your company name.';
        return '';
      case 3:
        if (!data.phone.trim()) return 'Please enter your phone number.';
        if (data.otpSent && !data.otpCode.trim()) return 'Please enter the verification code.';
        return '';
      case 4:
        if (data.goals.length === 0) return 'Please select at least one goal.';
        return '';
      case 6:
        if (!data.cardName.trim()) return 'Please enter the cardholder name.';
        if (data.cardNumber.replace(/\s/g, '').length < 16) return 'Please enter a valid card number.';
        if (!data.cardExpiry.trim()) return 'Please enter the expiry date.';
        if (data.cardCvv.length < 3) return 'Please enter a valid CVV.';
        return '';
      case 7:
        if (!data.supportType) return 'Please select a support preference.';
        return '';
      default:
        return '';
    }
  };

  // ─ submit ─
  const handleContinue = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    if (step === TOTAL_STEPS) { navigate('/'); return; }
    goForward();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) { setError('Please enter your email and password.'); return; }
    setIsLoading(true); setError('');
    try {
      await login({ email: loginEmail, password: loginPassword });
      navigate('/');
    } catch (e) { setError(friendlyError(e)); }
    finally { setIsLoading(false); }
  };

  const progress = step === 0 ? 0 : Math.round((step / TOTAL_STEPS) * 100);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_35%),linear-gradient(135deg,_#f6fbfc_0%,_#eef4f7_42%,_#f8fbfd_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-10"
    >
      <div className="mx-auto flex w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <section className="relative hidden w-[38%] overflow-hidden bg-[linear-gradient(160deg,_#0b2233_0%,_#0f3347_45%,_#1a5f6b_100%)] p-5 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(103,232,249,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.06),_transparent_45%)]" />

          <div className="relative z-10 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Icons.LogoSmall />
            </div>
            <div>
              <p className="text-[10px] font-light uppercase tracking-[0.26em] text-cyan-200/70">AI Native CRM</p>
              <p className="text-[13px] font-light leading-tight">Sales workspace</p>
            </div>
          </div>

          <div className="relative z-10 mt-6 max-w-[17rem]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">Calmer onboarding</p>
            <h1 className="mt-2 text-[2rem] font-light leading-[1.12] tracking-[-0.02em]">
              Set up your sales workspace now
            </h1>
            <p className="mt-4 text-[12px] leading-[1.6] text-slate-300/80">
              A guided experience that gets your team from sign-up to first pipeline in minutes — no overwhelming setup, just clarity.
            </p>
          </div>

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
                  <button type="button" onClick={() => setTestimonialIndex(i => (i - 1 + testimonials.length) % testimonials.length)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white" aria-label="Previous">
                    <Icons.ArrowLeft size={13} />
                  </button>
                  <button type="button" onClick={() => setTestimonialIndex(i => (i + 1) % testimonials.length)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white" aria-label="Next">
                    <Icons.ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <section className="flex flex-1 flex-col min-h-[600px]">

          {/* Mode tabs — shown on login or welcome step */}
          {(mode === 'login' || step === 0) && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-100/80 p-0.5">
                <button type="button" onClick={() => switchMode('login')}
                  className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                    mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  Login
                </button>
                <button type="button" onClick={() => switchMode('signup')}
                  className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                    mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                  Sign up
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {mode === 'login' ? 'Secure access for your workspace' : 'Setup takes under 2 minutes'}
              </p>
            </div>
          )}

          {/* Progress bar — shown on onboarding steps 1–8 */}
          {mode === 'signup' && step > 0 && (
            <div className="border-b border-slate-100 px-6 py-3">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={goBack}
                  className="flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-slate-700">
                  <Icons.ArrowLeft size={12} /> Back
                </button>
                <span className="text-[11px] font-medium text-slate-500">Step {step} of {TOTAL_STEPS}</span>
                <span className="text-[11px] font-semibold text-cyan-700">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,_#0f766e,_#0891b2)] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── STEP CONTENT ─────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col">
            {mode === 'login' ? (
              /* ── LOGIN ── */
              <form onSubmit={handleLogin} className="flex flex-1 flex-col items-center justify-center px-6 py-6">
                <div className="w-full max-w-[320px]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-700/80">Welcome back</p>
                  <h2 className="mt-1 text-[1.3rem] font-semibold tracking-[-0.02em] text-slate-900">Sign in to your workspace</h2>
                  <p className="mt-1 text-[12px] text-slate-500">Use your company credentials to pick up where your team left off.</p>

                  <div className="mt-6 space-y-4">
                    {error && <ErrorBanner msg={error} />}
                    <Field id="loginEmail" label="Work email" type="email" value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)} placeholder="name@company.com" autoComplete="email" />
                    <Field id="loginPassword" label="Password" type="password" value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />
                  </div>

                  <div className="mt-6 space-y-3">
                    <PrimaryBtn onClick={undefined} isLoading={isLoading}>
                      {isLoading ? 'Please wait…' : 'Sign in'}
                    </PrimaryBtn>
                    <p className="text-center text-[12px] text-slate-500">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-cyan-700 hover:text-cyan-800">Start signup</button>
                    </p>
                  </div>
                </div>
              </form>

            ) : (
              /* ── ONBOARDING STEPS ── */
              <div key={step} className={cn('flex flex-1 flex-col px-6 py-6 auth-step-panel',
                slideDir === 'forward' ? 'auth-step-panel-forward' : 'auth-step-panel-backward')}>
                {renderStep()}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  function renderStep() {
    switch (step) {

      // ── STEP 0: WELCOME ──────────────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
            {/* Brand name */}
            <p className="text-[11px] font-light uppercase tracking-[0.3em] text-slate-400">AI Native CRM</p>

            {/* Heading */}
            <h2 className="mt-2 text-[2rem] font-light tracking-[-0.03em] text-slate-900">
              Welcome
            </h2>
            <p className="mt-2 text-[13.5px] leading-[1.6] text-slate-500">
              Manage Your Clients, Leads, and Projects<br />All in One Place.
            </p>

            {/* CTA */}
            <button
              type="button"
              onClick={goForward}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:bg-slate-700 hover:shadow-lg"
            >
              Get Started <Icons.ArrowRight size={14} />
            </button>

            <p className="mt-5 text-[12px] text-slate-400">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')} className="font-semibold text-cyan-700 hover:text-cyan-800">
                Sign in
              </button>
            </p>
          </div>
        );


      // ── STEP 1: INDIVIDUAL INFO ───────────────────────────────────────────
      case 1:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={1} title="Tell us about you" subtitle="This creates your personal admin account." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="firstName" label="First name" value={data.firstName}
                    onChange={fieldSetter('firstName')} placeholder="Tawanda" autoComplete="given-name" />
                  <Field id="lastName" label="Last name" value={data.lastName}
                    onChange={fieldSetter('lastName')} placeholder="Ncube" autoComplete="family-name" />
                </div>
                <Field id="email" label="Work email" type="email" value={data.email}
                  onChange={fieldSetter('email')} placeholder="you@company.com" autoComplete="email" />
                <Field id="password" label="Create password" type="password" value={data.password}
                  onChange={fieldSetter('password')} placeholder="At least 8 characters" autoComplete="new-password" />
              </div>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={handleContinue} isLoading={isLoading}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
            </div>
          </div>
        );

      // ── STEP 2: COMPANY INFO ──────────────────────────────────────────────
      case 2:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={2} title="Name your workspace" subtitle="This is the company account your CRM data will live in." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-4">
                <Field id="companyName" label="Company name" value={data.companyName}
                  onChange={fieldSetter('companyName')} placeholder="Acme Growth Partners" autoComplete="organization" />
                <SelectField id="industry" label="Industry (optional)" value={data.industry}
                  onChange={fieldSetter('industry')} options={INDUSTRIES} placeholder="Select your industry" />
                <SelectField id="teamSize" label="Team size (optional)" value={data.teamSize}
                  onChange={fieldSetter('teamSize')} options={TEAM_SIZES} placeholder="How big is your team?" />
              </div>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={handleContinue} isLoading={isLoading}>
                {isLoading ? 'Creating workspace…' : <>Create workspace <Icons.ArrowRight size={15} /></>}
              </PrimaryBtn>
            </div>
          </div>
        );

      // ── STEP 3: PHONE VERIFICATION ────────────────────────────────────────
      case 3:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={3} title="Verify your number" subtitle="We'll send a quick code to confirm your identity." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Field id="phone" label="Phone number" type="tel" value={data.phone}
                      onChange={fieldSetter('phone')} placeholder="+1 555 000 0000" autoComplete="tel" />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={() => {
                      if (!data.phone.trim()) { setError('Please enter your phone number first.'); return; }
                      setError(''); setField('otpSent', true);
                    }}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100">
                      {data.otpSent ? 'Resend' : 'Send code'}
                    </button>
                  </div>
                </div>
                {data.otpSent && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="mb-2 text-[11px] font-medium text-emerald-700">✓ Code sent to {data.phone}</p>
                    <Field id="otpCode" label="Verification code" value={data.otpCode}
                      onChange={fieldSetter('otpCode')} placeholder="Enter 6-digit code" autoComplete="one-time-code" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryBtn onClick={handleContinue} isLoading={isLoading}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
              <button type="button" onClick={goForward}
                className="w-full text-center text-[12px] text-slate-400 transition hover:text-slate-600">
                Skip for now
              </button>
            </div>
          </div>
        );

      // ── STEP 4: GOALS ─────────────────────────────────────────────────────
      case 4:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={4} title="What brings you here?" subtitle="Select all that apply — we'll personalise your workspace." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-2">
                {GOALS.map(g => {
                  const checked = data.goals.includes(g.id);
                  return (
                    <label key={g.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-150',
                        checked
                          ? 'border-cyan-400 bg-cyan-50'
                          : 'border-slate-200 bg-slate-50/60 hover:border-cyan-200 hover:bg-slate-50'
                      )}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGoal(g.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-cyan-700"
                      />
                      <span className="text-lg leading-none">{g.emoji}</span>
                      <div className="flex-1">
                        <p className={cn('text-[13px] font-semibold', checked ? 'text-cyan-800' : 'text-slate-800')}>{g.label}</p>
                        <p className="text-[11px] text-slate-500">{g.desc}</p>
                      </div>
                      {checked && <Icons.CheckCircle size={15} className="shrink-0 text-cyan-600" />}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={handleContinue}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
            </div>
          </div>
        );


      // ── STEP 5: PLAN SELECTION ────────────────────────────────────────────
      case 5:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={5} title="Choose your plan" subtitle="You can change this anytime from settings." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-3">
                {PLANS.map(plan => {
                  const selected = data.selectedPlan === plan.id;
                  const bestForGoals = plan.recommended &&
                    (data.goals.includes('leads') || data.goals.includes('automate'));
                  return (
                    <button key={plan.id} type="button" onClick={() => setField('selectedPlan', plan.id)}
                      className={cn(
                        'relative w-full rounded-2xl border p-4 text-left transition-all duration-150',
                        selected
                          ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-400/30'
                          : 'border-slate-200 bg-slate-50/60 hover:border-cyan-200'
                      )}>
                      {plan.recommended && (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-cyan-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          {bestForGoals ? 'Best for your goals' : 'Recommended'}
                        </span>
                      )}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={cn('text-[14px] font-bold', selected ? 'text-cyan-900' : 'text-slate-900')}>{plan.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{plan.tagline}</p>
                        </div>
                        <div className="text-right">
                          <span className={cn('text-[18px] font-bold', selected ? 'text-cyan-800' : 'text-slate-900')}>{plan.price}</span>
                          <span className="text-[11px] text-slate-400">{plan.period}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {plan.features.map(f => (
                          <span key={f} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium',
                            selected ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-600')}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4">
              <PrimaryBtn onClick={handleContinue}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
            </div>
          </div>
        );

      // ── STEP 6: PAYMENT ───────────────────────────────────────────────────
      case 6:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={6} title="Payment details" subtitle="Your card won't be charged until your trial ends." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-4">
                <Field id="cardName" label="Cardholder name" value={data.cardName}
                  onChange={fieldSetter('cardName')} placeholder="Tawanda Ncube" autoComplete="cc-name" />
                <Field id="cardNumber" label="Card number" value={data.cardNumber}
                  onChange={e => setField('cardNumber', e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                  placeholder="1234 5678 9012 3456" autoComplete="cc-number" />
                <div className="grid grid-cols-2 gap-3">
                  <Field id="cardExpiry" label="Expiry (MM / YY)" value={data.cardExpiry}
                    onChange={fieldSetter('cardExpiry')} placeholder="MM / YY" autoComplete="cc-exp" />
                  <Field id="cardCvv" label="CVV" type="password" value={data.cardCvv}
                    onChange={fieldSetter('cardCvv')} placeholder="•••" autoComplete="cc-csc" />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Icons.Lock size={13} className="text-slate-400" />
                  <p className="text-[11px] text-slate-500">Your payment info is encrypted and secure. No charges today.</p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={handleContinue} isLoading={isLoading}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
            </div>
          </div>
        );

      // ── STEP 7: SUPPORT TYPE ──────────────────────────────────────────────
      case 7:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={7} title="How would you like support?" subtitle="Choose your preferred channel — you can update this later." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-3">
                {SUPPORT_OPTIONS.map(opt => {
                  const selected = data.supportType === opt.id;
                  return (
                    <button key={opt.id} type="button" onClick={() => setField('supportType', opt.id)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150',
                        selected
                          ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-400/30'
                          : 'border-slate-200 bg-slate-50/60 hover:border-cyan-200'
                      )}>
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="flex-1">
                        <p className={cn('text-[13px] font-semibold', selected ? 'text-cyan-900' : 'text-slate-800')}>{opt.label}</p>
                        <p className="text-[11px] text-slate-500">{opt.desc}</p>
                      </div>
                      {selected && <Icons.CheckCircle size={18} className="text-cyan-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6">
              <PrimaryBtn onClick={handleContinue}>Continue <Icons.ArrowRight size={15} /></PrimaryBtn>
            </div>
          </div>
        );

      // ── STEP 8: PROFILE (OPTIONAL) ────────────────────────────────────────
      case 8:
        return (
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <StepHeader step={8} title="Almost there — your profile" subtitle="Optional. You can do this later in Settings." />
              {error && <ErrorBanner msg={error} />}
              <div className="space-y-4">
                <Field id="jobTitle" label="Job title (optional)" value={data.jobTitle}
                  onChange={fieldSetter('jobTitle')} placeholder="e.g. Sales Director" autoComplete="organization-title" />
                <label htmlFor="bio" className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-slate-600">Short bio (optional)</span>
                  <textarea
                    id="bio" value={data.bio}
                    onChange={e => setField('bio', e.target.value)}
                    placeholder="A short sentence about yourself…" rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryBtn onClick={async () => {
                setIsLoading(true);
                setError('');
                try {
                  await register({
                    firstName: data.firstName, lastName: data.lastName,
                    email: data.email, password: data.password, companyName: data.companyName,
                  });
                  navigate('/');
                } catch (e) { setError(friendlyError(e)); }
                finally { setIsLoading(false); }
              }} isLoading={isLoading}>
                Complete setup <Icons.Sparkles size={15} />
              </PrimaryBtn>
              {error && <ErrorBanner msg={error} />}
              <button type="button" onClick={() => navigate('/')}
                className="w-full text-center text-[12px] text-slate-400 transition hover:text-slate-600">
                Skip for now — go to dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }
}
