'use client';

import Link from 'next/link';
import { TypewriterText } from '@/components/ui/TypewriterText';

// Typewriter animation: the label types first, then the h1 starts after
// the label completes + a 300ms pause. Computing the h1's delay from the
// label's length keeps the two animations in sync if the label ever changes.
const LABEL_TEXT = 'register a new ai use case';
const TYPE_SPEED_MS = 55;
const LABEL_TO_HEADING_PAUSE_MS = 300;
const HEADING_DELAY_MS = LABEL_TEXT.length * TYPE_SPEED_MS + LABEL_TO_HEADING_PAUSE_MS;

/**
 * First screen a user sees when registering a new AI use case.
 *
 * Primary action: **Register** — the 7-question Layer 1 form that routes
 * most users to a direct lightweight approval and the rest into a
 * pre-filled full intake. Details-oriented users can skip directly to
 * one of the three full-form experiences via the secondary section.
 */
export function IntakeMethodChooser() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
            <TypewriterText text={LABEL_TEXT} speed={TYPE_SPEED_MS} mono />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            <TypewriterText
              text="How would you like to start?"
              speed={TYPE_SPEED_MS}
              delay={HEADING_DELAY_MS}
            />
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Seven questions to register. We&apos;ll route you to the right review path from there.
          </p>
        </div>

        {/* Primary action — the Layer 1 quick register */}
        <Link
          href="/intake/register"
          className="group relative mb-6 block overflow-hidden rounded-2xl border-2 border-blue-400 bg-white p-6 shadow-md transition-all hover:-translate-y-0.5 hover:border-blue-500 hover:shadow-lg"
        >
          <div className="flex items-start gap-5">
            <div
              aria-hidden
              className="hidden h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 sm:flex"
            >
              <SinglePagePreview />
            </div>
            <div className="flex-1">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Recommended · 2 min
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Quick register</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Seven questions. Most cases get approved on the spot; higher-risk cases continue
                into a pre-filled full intake so you don&apos;t retype anything.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                Start →
              </span>
            </div>
          </div>
        </Link>

        {/* Alternative experiences — the full-intake options, all visible.
            Every option below collects the same ~30-question set; they
            differ only in how the questions are presented. Users pick the
            experience they prefer. */}
        <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>or pick a full intake experience</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MethodCard
            href="/intake/cards"
            title="Card flip"
            description="One question at a time on a deck of flip cards. Focused, paced, branching adapts as you go."
            preview={<CardFlipPreview />}
          />
          <MethodCard
            href="/intake/quick"
            title="Single page"
            description="Every question on one scrollable page with floating labels and pill toggles."
            preview={<SinglePagePreview />}
          />
          <MethodCard
            href="/intake/full"
            title="Full guided"
            description="Sectioned wizard with AI coaching, auto-save, and live classification."
            preview={<FullGuidedPreview />}
          />
        </div>
      </div>
    </div>
  );
}

interface MethodCardProps {
  href: string;
  title: string;
  description: string;
  preview: React.ReactNode;
}

function MethodCard({ href, title, description, preview }: MethodCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
    >
      {/* Preview area — fixed height, decorative, not interactive */}
      <div
        aria-hidden
        className="mb-4 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-slate-100"
      >
        {preview}
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
        Start →
      </span>
    </Link>
  );
}

/**
 * Static mini-mock of the card-flip flow: a fanned stack of three cards
 * with a dot-progress indicator underneath. On hover (`.group:hover`),
 * the top card performs a continuous 3D flip, revealing a second
 * "question" on its back face — a live preview of the actual interaction.
 */
function CardFlipPreview() {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      style={{ perspective: 600 }}
    >
      {/* Card stack — two static cards behind, one flipping card on top. */}
      <div className="relative h-20 w-28">
        <div
          className="absolute inset-0 rounded-lg border border-slate-200 bg-white shadow-sm"
          style={{ transform: 'rotate(-6deg) translate(-6px, 2px)' }}
        />
        <div
          className="absolute inset-0 rounded-lg border border-slate-200 bg-white shadow-sm"
          style={{ transform: 'rotate(2deg) translate(2px, -1px)' }}
        />
        {/* The flipping card — front face = card 1, back face = card 2. */}
        <div
          className="preview-card-flipper absolute inset-0"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-2 shadow-md"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="h-1 w-10 rounded-full bg-blue-400" />
            <div className="space-y-1">
              <div className="h-1 w-full rounded-full bg-slate-200" />
              <div className="h-1 w-3/4 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-2 w-6 rounded-full bg-blue-100" />
              <div className="h-2 w-8 rounded-full bg-blue-500" />
            </div>
          </div>
          <div
            className="absolute inset-0 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-2 shadow-md"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="h-1 w-14 rounded-full bg-blue-400" />
            <div className="space-y-1">
              <div className="h-1 w-5/6 rounded-full bg-slate-200" />
              <div className="h-1 w-2/3 rounded-full bg-slate-200" />
              <div className="h-1 w-1/2 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-2 w-8 rounded-full bg-blue-500" />
              <div className="h-2 w-6 rounded-full bg-blue-100" />
            </div>
          </div>
        </div>
      </div>
      {/* Dot progress */}
      <div className="absolute bottom-2 flex items-center gap-1">
        <span className="h-1 w-1 rounded-full bg-blue-400" />
        <span className="h-1 w-4 rounded-full bg-blue-500" />
        <span className="h-1 w-1 rounded-full border border-slate-300 bg-white" />
        <span className="h-1 w-1 rounded-full border border-slate-300 bg-white" />
        <span className="h-1 w-1 rounded-full border border-slate-300 bg-white" />
      </div>
    </div>
  );
}

/**
 * Static mini-mock of the single-page form: three floating-label rows,
 * each with a blue underline under the active one. On hover
 * (`.group:hover`), the middle row's label performs the floating-label
 * gesture (scale-shrink + translate up) while its underline bar scales
 * in from the left — the live interaction the form uses on focus.
 */
function SinglePagePreview() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div className="w-full space-y-3">
        {/* Row 1 — inactive */}
        <div>
          <div className="mb-0.5 h-1 w-10 rounded-full bg-slate-300" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="mt-1 h-px w-full bg-slate-300" />
        </div>
        {/* Row 2 — active. On hover, the label floats up and the
            underline bar scales in from the left. */}
        <div>
          <div className="preview-floating-label mb-0.5 h-1 w-12 origin-left rounded-full bg-blue-500" />
          <div className="h-1 w-4/5 rounded-full bg-slate-400" />
          <div className="preview-underline-bar mt-1 h-[2px] w-full origin-left rounded-full bg-blue-500" />
        </div>
        {/* Row 3 — pill toggles */}
        <div>
          <div className="mb-1 h-1 w-8 rounded-full bg-slate-300" />
          <div className="flex gap-1">
            <span className="h-2 w-8 rounded-full bg-blue-500" />
            <span className="h-2 w-6 rounded-full border border-slate-300 bg-white" />
            <span className="h-2 w-7 rounded-full border border-slate-300 bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Static mini-mock of the full guided wizard: a miniature sidebar with
 * section nav (the active one highlighted), a content area with a progress
 * strip, a few form rows, and a primary button. No hover animation — the
 * full wizard is the "no surprises" experience and the preview matches.
 */
function FullGuidedPreview() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <div className="flex h-24 w-full gap-1.5 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        {/* Sidebar */}
        <div className="flex w-12 flex-col justify-start gap-1 bg-slate-800 p-1.5">
          <div className="h-1 w-6 rounded-full bg-slate-500" />
          <div className="mt-0.5 h-1 w-full rounded-full bg-blue-500" />
          <div className="h-1 w-3/4 rounded-full bg-slate-600" />
          <div className="h-1 w-2/3 rounded-full bg-slate-600" />
          <div className="h-1 w-1/2 rounded-full bg-slate-600" />
        </div>
        {/* Content area */}
        <div className="flex flex-1 flex-col gap-1 p-2">
          <div className="h-0.5 w-full rounded-full bg-slate-100">
            <div className="h-full w-2/5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-0.5 h-1 w-3/4 rounded-full bg-slate-300" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-5/6 rounded-full bg-slate-200" />
          <div className="mt-auto flex items-center justify-end">
            <span className="h-2 w-8 rounded bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
