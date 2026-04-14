import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { FormField, PasswordField, PrimaryButton } from '../components/auth/FormFields';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { resetOnboarding } = useOnboarding();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
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
      });
      // New user — reset and start fresh onboarding
      resetOnboarding();
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
      headline="Set up your AI-powered sales workspace."
      subheadline="Create your admin account to get started. You'll configure your workspace, pipeline, and team in the next step."
      testimonial={{
        quote: "Onboarding took minutes, not days. We had our full pipeline running the same afternoon.",
        author: "Marcus Reeves",
        role: "Head of Revenue",
        company: "Cloudpath Systems",
      }}
    >
      <div>
        {/* Header */}
        <h2 className="text-[1.2rem] font-semibold text-gray-900 tracking-tight">
          Create your account
        </h2>
        <p className="mt-1 text-[0.8125rem] text-gray-500">
          Start with the essentials — we'll help you set up the rest.
        </p>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-md bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-[0.75rem] text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
            placeholder="Min. 8 characters"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />

          <FormField
            id="signup-company"
            label="Company name"
            placeholder="Acme Inc."
            value={companyName}
            onChange={setCompanyName}
            hint="We'll create your workspace with this name."
          />

          <div className="pt-1">
            <PrimaryButton type="submit" loading={isLoading}>
              {isLoading ? 'Creating account…' : 'Create account'}
            </PrimaryButton>
          </div>
        </form>

        <p className="mt-3 text-center text-[0.6875rem] text-gray-400">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Footer */}
        <p className="mt-3 text-center text-[0.75rem] text-gray-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-teal-700 hover:text-teal-800 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
