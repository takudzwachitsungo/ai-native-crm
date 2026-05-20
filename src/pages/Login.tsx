import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormField, PasswordField, PrimaryButton } from '../components/auth/FormFields';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [requiresWorkspace, setRequiresWorkspace] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
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
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || 'Authentication failed. Please try again.';

      if (code === 'TWO_FACTOR_REQUIRED') {
        setRequiresOtp(true);
        setShowSecurityOptions(true);
        setError('Enter your authenticator code to finish signing in.');
      } else if (code === 'TWO_FACTOR_INVALID') {
        setRequiresOtp(true);
        setShowSecurityOptions(true);
        setError('That authentication code was not accepted. Please try again.');
      } else if (msg.toLowerCase().includes('multiple workspaces')) {
        setRequiresWorkspace(true);
        setShowSecurityOptions(true);
        setError('This email belongs to more than one workspace. Enter your workspace slug to continue.');
      } else if (status === 401) {
        setError('Invalid workspace, email, or password. Please check your details.');
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
      headline="Welcome back to your sales workspace."
      subheadline="Sign in to manage pipeline, service activity, reporting, and team operations from one place."
      testimonial={{
        quote: "We closed 40% more deals in the first quarter. The AI insights changed how our team prioritizes leads.",
        author: "Sarah Chen",
        role: "VP of Sales",
        company: "Meridian Technologies",
      }}
    >
      <div>
        <h2 className="text-[1.2rem] font-semibold text-foreground tracking-tight">
          Sign in
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          Enter your credentials to access your workspace.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[0.75rem] text-red-700">{error}</p>
          </div>
        )}

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

          <div>
            <button
              type="button"
              onClick={() => setShowSecurityOptions(!showSecurityOptions)}
              className="text-[0.75rem] font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {showSecurityOptions ? 'Hide' : 'Show'} workspace and security options
            </button>
          </div>

          {showSecurityOptions && (
            <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-3">
              <FormField
                id="login-workspace"
                label={requiresWorkspace ? 'Workspace slug required' : 'Workspace slug'}
                placeholder="my-workspace"
                value={workspaceSlug}
                onChange={(v) => setWorkspaceSlug(v.toLowerCase())}
                hint="Only needed if your email belongs to multiple workspaces."
              />

              <FormField
                id="login-otp"
                label={requiresOtp ? 'Authentication code required' : 'Authentication code'}
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
              {isLoading ? 'Signing in...' : 'Sign in'}
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-4 text-center text-[0.75rem]">
          <Link
            to="/reset-password"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Forgot your password?
          </Link>
        </p>

        <p className="mt-4 text-center text-[0.75rem] text-muted-foreground">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
