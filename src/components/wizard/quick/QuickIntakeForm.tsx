'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { intakeQuestions } from '@/config/questions';
import {
  getInlineBanners,
  getVisibleIntakeQuestions,
  isFastTrackEligible,
} from '@/lib/questions/branching-rules';
import { intakeSchema } from '@/lib/questions/intake-schema';
import { calculateInherentRisk } from '@/lib/risk/inherent-risk';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useWizardStore } from '@/lib/store/wizard-store';
import { FloatingQuestionRenderer } from './FloatingQuestionRenderer';

/**
 * Single-page intake form.
 *
 * Presents the full intake schema as one continuous floating-label form —
 * same question set as the guided wizard and the card flow, just a
 * different visual experience. Branching and conditional sub-field reveal
 * work identically (via `getVisibleIntakeQuestions`). Submit goes through
 * `/api/intake/submit` so classification, inventory writes, and everything
 * downstream match the other flows exactly.
 */
export function QuickIntakeForm() {
  const formData = useWizardStore((s) => s.formData);
  const updateField = useWizardStore((s) => s.updateField);
  const setSaving = useWizardStore((s) => s.setSaving);
  const markSaved = useWizardStore((s) => s.markSaved);
  const resetWizard = useWizardStore((s) => s.reset);
  const addUseCase = useInventoryStore((s) => s.addUseCase);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const state = formData as Record<string, unknown>;

  // Recompute visible questions on every render — same branching logic
  // the card flow uses (Q9a/Q9b, Q10a, Q11a, Section C fast-track hide).
  const visibleQuestionIds = useMemo(() => getVisibleIntakeQuestions(state), [state]);
  const visibleQuestions = useMemo(
    () => intakeQuestions.filter((q) => visibleQuestionIds.has(q.id)),
    [visibleQuestionIds],
  );

  const inlineBanners = useMemo(() => getInlineBanners(state), [state]);
  const bannersAfter = useMemo(() => {
    const map = new Map<string, typeof inlineBanners>();
    for (const b of inlineBanners) {
      const list = map.get(b.afterQuestionId) ?? [];
      list.push(b);
      map.set(b.afterQuestionId, list);
    }
    return map;
  }, [inlineBanners]);

  // Fast-track banner: show only when user hasn't decided and is eligible
  const showFastTrackBanner = state.fastTrackOptIn === undefined && isFastTrackEligible(state);

  // Group visible questions by section for the section-jump chips.
  const sections = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; title: string; questions: typeof visibleQuestions }[] = [];
    for (const q of visibleQuestions) {
      if (!seen.has(q.section)) {
        seen.add(q.section);
        out.push({
          id: `section-${q.section.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          title: q.section,
          questions: [],
        });
      }
      out[out.length - 1]?.questions.push(q);
    }
    return out;
  }, [visibleQuestions]);

  // Field change handler: update store, clear any existing error on that field.
  const handleChange = useCallback(
    (field: string, value: unknown) => {
      updateField(field, value);
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [updateField],
  );

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  // Scroll a specific field into view and focus it.
  const scrollToField = useCallback((field: string) => {
    const el = fieldRefs.current[field];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el.querySelector<HTMLElement>(
      'input, textarea, select, button[type="button"]',
    );
    focusable?.focus();
  }, []);

  // Auto-save draft — shared with the guided shell and card flow through wizard-store
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = true;
    const t = window.setTimeout(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSaving(true);
      try {
        await fetch('/api/intake/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData }),
        });
        markSaved();
      } catch {
        setSaving(false);
      }
    }, 2000);
    return () => window.clearTimeout(t);
  }, [formData, setSaving, markSaved]);

  const handleSubmit = useCallback(async () => {
    // Mark every visible field as touched so all errors become visible.
    const allTouched: Record<string, boolean> = {};
    for (const q of visibleQuestions) allTouched[q.field] = true;
    setTouched(allTouched);

    const parsed = intakeSchema.safeParse(formData);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      // Scroll to the first invalid field that is actually visible.
      const firstVisibleError = visibleQuestions.find((q) => nextErrors[q.field]);
      if (firstVisibleError) scrollToField(firstVisibleError.field);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: parsed.data }),
      });
      const result = (await res.json()) as {
        data?: {
          id: string;
          intake: Parameters<typeof calculateInherentRisk>[0];
          classification: {
            euAiActTier: string;
            riskTier: string;
            overrideTriggered: boolean;
            explanation: string[];
          };
        };
      };
      if (!result.data) throw new Error('Submit failed');
      const now = new Date().toISOString();
      const inherentRisk = calculateInherentRisk(result.data.intake);
      addUseCase({
        id: result.data.id,
        intake: result.data.intake as never,
        classification: result.data.classification as never,
        inherentRisk,
        status: 'submitted',
        timeline: [{ status: 'submitted', timestamp: now, changedBy: 'mock-user@example.com' }],
        comments: [],
        createdAt: now,
        updatedAt: now,
        submittedBy: 'mock-user@example.com',
      });
      setSubmittedId(result.data.id);
      resetWizard();
    } catch (e) {
      setErrors({ __form: e instanceof Error ? e.message : 'Submit failed' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, visibleQuestions, addUseCase, resetWizard, scrollToField]);

  if (submittedId) {
    return <SuccessState id={submittedId} />;
  }

  const shownError = (field: string): string | undefined =>
    touched[field] ? errors[field] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/intake"
            className="text-xs text-slate-500 transition-colors hover:text-slate-700"
          >
            ← Choose a different method
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Register a new AI use case
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            One page — every question in the intake. Auto-save is on.
          </p>
        </div>

        {/* Section jump chips */}
        {sections.length > 1 && (
          <nav
            aria-label="Jump to section"
            className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/70 p-2 backdrop-blur"
          >
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                {s.title}
              </a>
            ))}
          </nav>
        )}

        {/* Fast-track banner */}
        {showFastTrackBanner && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
                !
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">
                  This case qualifies for fast-track
                </p>
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  Based on your answers, you can skip the Portfolio Alignment section. Pick an
                  option to continue.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('fastTrackOptIn', true)}
                    className="rounded-full bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                  >
                    Skip Portfolio Alignment
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('fastTrackOptIn', false)}
                    className="rounded-full border border-blue-300 bg-white px-4 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                  >
                    Fill out everything
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 space-y-7">
                <div className="border-b border-slate-100 pb-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">
                    {section.title}
                  </h2>
                </div>
                {section.questions.map((question) => {
                  const banners = bannersAfter.get(question.id) ?? [];
                  return (
                    <div
                      key={question.id}
                      ref={(el) => {
                        fieldRefs.current[question.field] = el;
                      }}
                      className="animate-fade-in"
                    >
                      <FloatingQuestionRenderer
                        question={question}
                        value={state[question.field]}
                        error={shownError(question.field)}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      {banners.map((banner) => (
                        <div
                          key={banner.id}
                          className={`mt-3 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                            banner.severity === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-blue-200 bg-blue-50 text-blue-800'
                          }`}
                        >
                          {banner.message}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>

          {errors.__form && (
            <div className="mt-6 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
              {errors.__form}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <title>Loading spinner</title>
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                  />
                </svg>
                Submitting…
              </span>
            ) : (
              'Submit intake'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ id }: { id: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
      <div className="mx-auto w-full max-w-md animate-fade-in rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2.5}
            stroke="currentColor"
            className="h-8 w-8 text-green-600"
            aria-hidden
          >
            <title>Success checkmark</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
              className="check-draw"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Intake submitted</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Your use case has been added to the inventory. The governance team has been notified and
          will reach out shortly.
        </p>
        <p className="mt-3 font-mono text-[11px] text-slate-400">Reference: {id}</p>
        <div className="mt-7 flex flex-col gap-2">
          <Link
            href="/inventory"
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
          >
            View in inventory
          </Link>
          <Link
            href="/intake"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Register another
          </Link>
        </div>
      </div>
    </div>
  );
}
