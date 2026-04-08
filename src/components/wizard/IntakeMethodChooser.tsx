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
 * All three intake flows collect the exact same question set — this page
 * is for picking the *experience*, not the content. Each card shows a
 * tiny static preview of what the flow looks like so the user can choose
 * visually.
 */
export function IntakeMethodChooser() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-base font-medium text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
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
            Same questions either way — pick the experience that fits you. You can always switch
            later.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MethodCard
            href="/intake/cards"
            title="Card-flip intake"
            description="One question at a time on a deck of flip cards. Best when you want to pace yourself and focus on each decision."
            preview={<CardFlipPreview />}
          />
          <MethodCard
            href="/intake/quick"
            title="Single-page form"
            description="Every question on one scrollable page with floating labels and pill toggles. Best when you want to see everything at once."
            preview={<SinglePagePreview />}
          />
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/intake/full"
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Or use the full guided intake (sectioned wizard with AI coaching and live
            classification)
          </Link>
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
