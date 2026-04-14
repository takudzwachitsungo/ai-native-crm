import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormField, PasswordField, PrimaryButton } from '../components/auth/FormFields';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({
        email,
        password,
        workspaceSlug: workspaceSlug || undefined,
        otpCode: otpCode || undefined,
      });
      // Existing users skip onboarding — go straight to dashboard
      completeOnboarding();
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please try again.';
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab="login"
      headline="Welcome back to your sales command center."
      subheadline="Sign in to access your pipeline, insights, and AI-powered workflows — right where you left off."
      testimonial={{
        quote: "We closed 40% more deals in the first quarter. The AI insights changed how our team prioritizes leads.",
        author: "Sarah Chen",
        role: "VP of Sales",
        company: "Meridian Technologies",
      }}
    >
      <div>
        {/* Header */}
        <h2 className="text-[1.2rem] font-semibold text-gray-900 tracking-tight">
          Sign in
        </h2>
        <p className="mt-1 text-[0.8125rem] text-gray-500">
          Enter your credentials to access your workspace.
        </p>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[0.75rem] text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <FormField
            id="login-email"
            label="Work email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <PasswordField
            id="login-password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />

          {/* Advanced options toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[0.75rem] text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-3">
              <FormField
                id="login-workspace"
                label="Workspace slug"
                placeholder="my-workspace"
                value={workspaceSlug}
                onChange={(v) => setWorkspaceSlug(v.toLowerCase())}
                hint="Only needed if your email belongs to multiple workspaces."
              />

              <FormField
                id="login-otp"
                label="Authentication code"
                placeholder="6-digit code"
                value={otpCode}
                onChange={setOtpCode}
                inputMode="numeric"
                hint="Only required if two-factor authentication is enabled."
              />
            </div>
          )}

          <div className="pt-1">
            <PrimaryButton type="submit" loading={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>
          </div>
        </form>

        {/* Footer */}
        <p className="mt-4 text-center text-[0.75rem] text-gray-500">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-teal-700 hover:text-teal-800 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
