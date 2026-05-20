import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../icons';

interface AuthLayoutProps {
  children: React.ReactNode;
  headline: string;
  subheadline: string;
  activeTab: 'login' | 'signup';
  testimonial?: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
}

export function AuthLayout({ children, headline, subheadline, activeTab, testimonial }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-[1040px] overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-gray-900/10 lg:h-[720px] lg:max-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden border-r border-border bg-[#0f172a] px-8 py-8 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary">
                  <Icons.LogoSmall />
                </div>
                <span className="text-sm font-semibold tracking-tight">Cicosy CRM</span>
              </div>

              <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blue-200">
                Sales operations workspace
              </p>
              <h1 className="max-w-sm text-2xl font-semibold leading-tight tracking-tight">
                {headline}
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100/75">
                {subheadline}
              </p>
            </div>

            {testimonial && (
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm leading-6 text-white/75">"{testimonial.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-sm font-semibold text-blue-100">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/90">{testimonial.author}</p>
                    <p className="text-xs text-white/45">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="flex min-h-[560px] min-w-0 flex-col bg-card lg:min-h-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:justify-end">
              <div className="flex items-center gap-2 lg:hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icons.LogoSmall />
                </div>
                <span className="text-sm font-semibold tracking-tight">Cicosy CRM</span>
              </div>

              <div className="inline-flex rounded-lg border border-border bg-secondary p-0.5">
                <button
                  onClick={() => navigate('/login')}
                  className={`rounded-md px-4 py-1.5 text-[0.75rem] font-medium transition-all ${
                    activeTab === 'login'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Log in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className={`rounded-md px-4 py-1.5 text-[0.75rem] font-medium transition-all ${
                    activeTab === 'signup'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 py-10 lg:items-start lg:pt-14">
              <div className="w-full max-w-[400px]">
                {children}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
