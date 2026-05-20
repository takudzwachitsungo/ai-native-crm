import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormField, PasswordField, PrimaryButton } from '../components/auth/FormFields';

const PASSWORD_REQUIREMENTS = 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.';

function validatePassword(password: string): string | null {
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one symbol.';
  return null;
}

function toWorkspaceSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    if (!workspaceSlug) {
      setWorkspaceSlug(toWorkspaceSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setError(passwordValidationError);
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        companyName: companyName || `${firstName}'s Workspace`,
        workspaceSlug: workspaceSlug || undefined,
      });
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab="signup"
      headline="Create your CRM workspace."
      subheadline="Start with your admin account. The setup flow will help shape your pipeline, team, and reporting preferences."
      testimonial={{
        quote: "Onboarding took minutes, not days. We had our full pipeline running the same afternoon.",
        author: "Marcus Reeves",
        role: "Head of Revenue",
        company: "Cloudpath Systems",
      }}
    >
      <div>
        <h2 className="text-[1.2rem] font-semibold text-foreground tracking-tight">
          Create your account
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          Start with the essentials. We'll help you set up the rest.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[0.75rem] text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              id="signup-firstName"
              label="First name"
              placeholder="Jane"
              value={firstName}
              onChange={setFirstName}
              required
              autoComplete="given-name"
            />
            <FormField
              id="signup-lastName"
              label="Last name"
              placeholder="Doe"
              value={lastName}
              onChange={setLastName}
              required
              autoComplete="family-name"
            />
          </div>

          <FormField
            id="signup-email"
            label="Work email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <PasswordField
            id="signup-password"
            label="Password"
            placeholder="Strong password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />
          <p className="text-[0.72rem] text-muted-foreground -mt-1">
            {PASSWORD_REQUIREMENTS}
          </p>

          <FormField
            id="signup-company"
            label="Company name"
            placeholder="Acme Inc."
            value={companyName}
            onChange={handleCompanyNameChange}
            hint="We'll create your workspace with this name."
          />

          <FormField
            id="signup-workspace"
            label="Workspace slug"
            placeholder="acme"
            value={workspaceSlug}
            onChange={(value) => setWorkspaceSlug(toWorkspaceSlug(value))}
            hint="Used when signing in if your email belongs to more than one workspace."
          />

          <div className="pt-1">
            <PrimaryButton type="submit" loading={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-3 text-center text-[0.6875rem] text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className="mt-3 text-center text-[0.75rem] text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
