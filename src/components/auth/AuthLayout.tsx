import React from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="flex w-full max-w-[860px] min-h-[520px] rounded-2xl overflow-hidden shadow-xl shadow-gray-900/10">
        {/* Left branded panel */}
        <div className="hidden lg:flex lg:w-[42%] relative flex-col justify-between p-8 overflow-hidden shrink-0">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1120] via-[#0f1d35] to-[#0a2540]" />
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/3 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 8C8.5 7 10 6 12 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-white/90 font-light text-base tracking">Native CRM</span>
          </div>

          {/* Eyebrow */}
          <p className="text-teal-400/80 text-[0.65rem] font-light uppercase tracking-[0.2em] mb-3">
            AI-Powered Sales Workspace
          </p>

          {/* Headline */}
          <h1 className="text-white text-[1.5rem] leading-[1.2] font-semibold tracking-tight mb-3">
            {headline}
          </h1>

          {/* Subheadline */}
          <p className="text-white/50 text-[0.8125rem] leading-relaxed max-w-xs">
            {subheadline}
          </p>
        </div>

        {/* Testimonial / Proof card */}
        {testimonial && (
          <div className="relative z-10">
            <div className="border border-white/[0.06] bg-white/[0.03] rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white/60 text-[0.8125rem] leading-relaxed mb-3 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/20 flex items-center justify-center text-teal-400 text-xs font-semibold">
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p className="text-white/80 text-xs font-small">{testimonial.author}</p>
                  <p className="text-white/35 text-xs">{testimonial.role}, {testimonial.company}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-white lg:rounded-l-0 relative">
        {/* Toggle tabs */}
        <div className="flex justify-end p-4 pb-0">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-1.5 text-[0.75rem] font-medium rounded-md transition-all ${
                activeTab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className={`px-4 py-1.5 text-[0.75rem] font-medium rounded-md transition-all ${
                activeTab === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign up
            </button>
          </div>
        </div>

        {/* Mobile top branding */}
        <div className="lg:hidden absolute top-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
                <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 8C8.5 7 10 6 12 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-gray-900 font-semibold text-base tracking-tight">NativeCRM</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[340px] px-5 py-6">
            {children}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
