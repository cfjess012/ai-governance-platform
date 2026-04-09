'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type UserRole, useSessionStore } from '@/lib/store/session-store';

const PERSONAS: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  description: string;
  defaultTitle: string;
  landing: string;
  icon: string;
  accent: string;
  border: string;
}> = [
  {
    role: 'business_user',
    title: 'Business User',
    subtitle: 'Use Case Owner',
    description:
      'Submit new AI use cases for governance review, track the status of your submissions, and respond to governance team feedback.',
    defaultTitle: 'Product Manager',
    landing: '/inventory',
    icon: '1',
    accent: 'from-blue-500 to-blue-600',
    border: 'border-blue-200 hover:border-blue-400',
  },
  {
    role: 'governance_analyst',
    title: 'Governance Analyst',
    subtitle: 'AI Risk Officer',
    description:
      'Triage incoming use cases, conduct risk assessments, manage evidence collection, approve or reject cases, and maintain the exception register.',
    defaultTitle: 'AI Governance Analyst',
    landing: '/triage',
    icon: '2',
    accent: 'from-indigo-500 to-purple-600',
    border: 'border-indigo-200 hover:border-indigo-400',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selected = PERSONAS.find((p) => p.role === selectedRole);

  const handleLogin = () => {
    if (!selectedRole || !name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    setError(null);
    login({
      name: name.trim(),
      email: email.trim(),
      title: title.trim() || selected?.defaultTitle || '',
      role: selectedRole,
    });
    router.push(selected?.landing ?? '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-bold mb-4 shadow-lg">
            AI
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            AI Governance Platform
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Select your role to get started. This is a simulated login for the POC — your name will
            appear on all governance records you create.
          </p>
        </div>

        {/* Persona cards */}
        {!selectedRole ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERSONAS.map((persona) => (
              <button
                key={persona.role}
                type="button"
                onClick={() => {
                  setSelectedRole(persona.role);
                  setTitle(persona.defaultTitle);
                }}
                className={`text-left rounded-2xl border-2 bg-white p-6 transition-all shadow-sm hover:shadow-md ${persona.border}`}
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${persona.accent} text-white text-sm font-bold mb-4`}
                >
                  {persona.icon}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{persona.title}</h2>
                <p className="text-xs font-medium text-slate-500 mb-2">{persona.subtitle}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{persona.description}</p>
              </button>
            ))}
          </div>
        ) : (
          /* Identity form */
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${selected?.accent} text-white text-sm font-bold`}
              >
                {selected?.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected?.title}</h2>
                <p className="text-xs text-slate-500">{selected?.subtitle}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="login-name"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Your name
                </label>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-400">
                  This name will appear on every governance record you create — triage decisions,
                  assessment submissions, evidence attestations, approval notes.
                </p>
              </div>

              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., sarah.chen@company.com"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="login-title"
                  className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5"
                >
                  Title
                </label>
                <input
                  id="login-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selected?.defaultTitle}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={!name.trim() || !email.trim()}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Continue as {selected?.title}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setName('');
                    setEmail('');
                    setTitle('');
                    setError(null);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This is a simulated login for the proof of concept. In production, this will be
                replaced with SSO / SAML authentication integrated with your organization&apos;s
                identity provider. No credentials are stored.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
