'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitIntake } from '@/lib/intake/submit';
import type { IntakeFormState } from '@/lib/questions/branching-rules';
import { useInventoryStore } from '@/lib/store/inventory-store';
import { useSessionStore } from '@/lib/store/session-store';
import { useWizardStore } from '@/lib/store/wizard-store';
import {
  assignFaces,
  buildDeck,
  type Card,
  remapIndex,
  summaryEntries,
  validateCard,
} from '@/lib/wizard/card-deck';
import { DotProgress } from './DotProgress';
import { FastTrackDecisionCard } from './FastTrackDecisionCard';
import { QuestionCardBody } from './QuestionCardBody';
import { SummaryCard } from './SummaryCard';

const FLIP_DURATION_MS = 700;
const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Card-flip intake wizard — one card per visible question, plus a
 * fast-track decision card (when applicable) and a final summary card.
 *
 * Navigation model:
 *   - "Next" commits the answer, validates the current card, and if valid
 *     triggers a forward flip (rotateY -180) to the next card.
 *   - "Back" triggers a backward flip (rotateY +180) to the previous card.
 *   - Direction alternates naturally via sign of the rotation, so the card
 *     keeps rotating in the direction of travel.
 *
 * Deck is recomputed from `formData` on every render — branching changes
 * (e.g. answering "yes" to thirdPartyInvolved) immediately reshape the deck.
 * When the current card disappears mid-flow, `remapIndex` keeps the user
 * anchored to the nearest prior question.
 */
export function CardFlipWizard() {
  const router = useRouter();
  const formData = useWizardStore((s) => s.formData);
  const updateField = useWizardStore((s) => s.updateField);
  const setSaving = useWizardStore((s) => s.setSaving);
  const markSaved = useWizardStore((s) => s.markSaved);
  const setSubmitted = useWizardStore((s) => s.setSubmitted);
  const resetWizard = useWizardStore((s) => s.reset);
  const isSaving = useWizardStore((s) => s.isSaving);
  const lastSavedAt = useWizardStore((s) => s.lastSavedAt);
  const sessionId = useWizardStore((s) => s.sessionId);
  const startFresh = useWizardStore((s) => s.startFresh);
  const addUseCase = useInventoryStore((s) => s.addUseCase);
  const sessionEmail = useSessionStore((s) => s.user?.email ?? 'unknown@example.com');

  // P2 fix: if there's no active session (stale data from prior completed intake),
  // start a fresh session. This clears any cross-contaminated form data.
  // If there IS a sessionId, we're in the middle of a legitimate flow (e.g.,
  // QuickRegister → CardFlip routing) and keep the pre-filled data.
  const [freshCleared, setFreshCleared] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: must run once on mount to detect stale sessions
  useEffect(() => {
    if (!sessionId && Object.keys(formData).length > 0) {
      startFresh();
      setFreshCleared(true);
      const timer = setTimeout(() => setFreshCleared(false), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const state = formData as IntakeFormState;

  // Build the current deck on every render from the latest state.
  const deck = useMemo(() => buildDeck(state), [state]);

  // Track previous deck so we can remap the index when branching changes it.
  const prevDeckRef = useRef<Card[]>(deck);
  const [cardIndex, setCardIndex] = useState(0);
  const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null);
  // Accumulated rotation in degrees. Each forward flip subtracts 180;
  // each backward flip adds 180. The card keeps rotating in the direction
  // of travel and never snaps back.
  const [rotation, setRotation] = useState(0);
  // Parity tracks which physical face is *currently* facing the user:
  // 0 = front visible, 1 = back visible. It lags rotation by design —
  // parity only flips AFTER the transform transition completes, so the
  // visible face keeps holding `cardIndex` throughout the animation and
  // the incoming face holds `pendingCardIndex`. This is what makes the
  // flip read as the old question rotating away and the new question
  // coming in, instead of both faces instantly showing the new content.
  const [parity, setParity] = useState<0 | 1>(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If the deck changes underneath us, re-anchor to the same logical card.
  // We intentionally read cardIndex out of the ref rather than from deps: the
  // effect should only re-run when the deck identity changes, never because
  // cardIndex changed (that would cause a remap loop right after the remap).
  const cardIndexRef = useRef(cardIndex);
  cardIndexRef.current = cardIndex;
  useEffect(() => {
    if (prevDeckRef.current === deck) return;
    const remapped = remapIndex(prevDeckRef.current, cardIndexRef.current, deck);
    prevDeckRef.current = deck;
    if (remapped !== cardIndexRef.current) setCardIndex(remapped);
  }, [deck]);

  const currentCard: Card | undefined = deck[cardIndex];

  // Assign each physical face (front/back) to a card. During a flip,
  // the face currently visible to the user (determined by `parity`, which
  // lags rotation) keeps holding `cardIndex`; the incoming face preloads
  // `pendingCardIndex`. See `assignFaces` for the full rules.
  const { front: frontCard, back: backCard } = assignFaces(
    deck,
    cardIndex,
    pendingCardIndex,
    parity,
  );

  // ── Auto-save draft ────────────────────────────────────────────────────
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
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [formData, setSaving, markSaved]);

  // ── Navigation ─────────────────────────────────────────────────────────

  const clearErrorOnChange = useCallback(
    (field: string, value: unknown) => {
      updateField(field, value);
      if (error) setError(null);
    },
    [updateField, error],
  );

  const flipTo = useCallback(
    (nextIndex: number, direction: 'forward' | 'backward') => {
      if (nextIndex < 0 || nextIndex >= deck.length) return;
      if (isFlipping) return; // already flipping
      setIsFlipping(true);
      setPendingCardIndex(nextIndex);
      // Accumulate rotation in the direction of travel so the card keeps
      // rotating naturally across consecutive flips. Parity intentionally
      // does NOT update here — it flips inside the setTimeout below, after
      // the CSS transition actually settles on the new orientation.
      setRotation((r) => r + (direction === 'forward' ? -180 : 180));
      window.setTimeout(() => {
        setCardIndex(nextIndex);
        setPendingCardIndex(null);
        setParity((p) => (p === 0 ? 1 : 0));
        setIsFlipping(false);
      }, FLIP_DURATION_MS);
    },
    [deck.length, isFlipping],
  );

  const handleNext = useCallback(() => {
    if (!currentCard) return;
    if (currentCard.kind === 'question') {
      const value = state[currentCard.question.field];
      const validationError = validateCard(currentCard.question, value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    if (currentCard.kind === 'fast-track-decision') {
      if (state.fastTrackOptIn === undefined) {
        setError('Choose an option to continue');
        return;
      }
    }
    setError(null);
    flipTo(cardIndex + 1, 'forward');
  }, [currentCard, state, cardIndex, flipTo]);

  const handleBack = useCallback(() => {
    if (cardIndex === 0) return;
    setError(null);
    flipTo(cardIndex - 1, 'backward');
  }, [cardIndex, flipTo]);

  const handleEdit = useCallback(
    (questionId: string) => {
      const targetIndex = deck.findIndex((c) => c.kind === 'question' && c.id === questionId);
      if (targetIndex === -1) return;
      const direction = targetIndex < cardIndex ? 'backward' : 'forward';
      flipTo(targetIndex, direction);
    },
    [deck, cardIndex, flipTo],
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Use the unified submitIntake pipeline so the Layer 1 router fires
      // consistently for every intake flow (Gap 3 fix).
      const result = submitIntake({
        formData: formData as Parameters<typeof submitIntake>[0]['formData'],
        submittedBy: sessionEmail,
      });
      if (!result.ok) {
        const firstField = Object.keys(result.errors)[0] ?? '';
        const targetIndex = deck.findIndex(
          (c) => c.kind === 'question' && c.question.field === firstField,
        );
        if (targetIndex !== -1) {
          setError(`${result.errors[firstField]} — flipping back to fix`);
          flipTo(targetIndex, 'backward');
        } else {
          setError(Object.values(result.errors)[0] ?? 'Validation failed');
        }
        return;
      }
      addUseCase(result.useCase);
      setSubmitted(true);
      resetWizard();
      router.push('/inventory');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, deck, flipTo, addUseCase, setSubmitted, resetWizard, router]);

  // ── Keyboard: ArrowRight next, ArrowLeft back ─────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      }
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handleBack();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleNext, handleBack]);

  // ── Derived UI state ───────────────────────────────────────────────────
  const nextDisabled = (() => {
    if (!currentCard) return true;
    if (currentCard.kind === 'summary') return true; // summary uses its own submit button
    if (currentCard.kind === 'question') {
      const value = state[currentCard.question.field];
      return validateCard(currentCard.question, value) !== null;
    }
    if (currentCard.kind === 'fast-track-decision') {
      return state.fastTrackOptIn === undefined;
    }
    return true;
  })();

  const stepLabel = `${cardIndex + 1} of ${deck.length}`;

  // ── Render a card's body (for either face) ────────────────────────────
  const renderCardBody = (card: Card | undefined) => {
    if (!card) return null;
    if (card.kind === 'summary') {
      return (
        <SummaryCard
          entries={summaryEntries(state)}
          onEdit={handleEdit}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      );
    }
    if (card.kind === 'fast-track-decision') {
      return (
        <FastTrackDecisionCard
          decision={state.fastTrackOptIn}
          onDecide={(optIn) => {
            updateField('fastTrackOptIn', optIn);
            if (error) setError(null);
          }}
        />
      );
    }
    return (
      <QuestionCardBody
        question={card.question}
        value={state[card.question.field]}
        error={undefined}
        onChange={clearErrorOnChange}
      />
    );
  };

  const cardStyle: React.CSSProperties = {
    // Fixed height so neither face's content length can cause the container
    // to jump when parity swaps. Faces are both absolutely positioned inside.
    height: 580,
    transform: `rotateY(${rotation}deg)`,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/intake" className="text-xs text-slate-500 hover:text-slate-700">
            ← Back to full intake
          </Link>
          <div className="text-xs text-slate-400">
            {isSaving ? 'Saving…' : lastSavedAt ? 'Saved' : ''}
          </div>
        </div>

        {/* P2: Form cleared notification */}
        {freshCleared && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Form cleared — starting fresh
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <DotProgress total={deck.length} current={cardIndex} label={stepLabel} />
        </div>

        {/* Card */}
        <div className="card-scene">
          <div className="card-3d" style={cardStyle}>
            {/* Front face — holds whichever card is currently "at rotateY(0)". */}
            <div className="card-3d-face card-3d-face--front rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              {renderCardBody(frontCard)}
            </div>
            {/* Back face — holds whichever card is currently "at rotateY(180)". */}
            <div className="card-3d-face card-3d-face--back rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              {renderCardBody(backCard)}
            </div>
          </div>
        </div>

        {/* Error (shown outside the flipping element so it's never clipped) */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {/* Nav buttons — hidden on summary card (it has its own submit) */}
        {currentCard?.kind !== 'summary' && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={cardIndex === 0 || isFlipping}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={nextDisabled || isFlipping}
              className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
