/**
 * Card-flip wizard deck logic.
 *
 * Pure functions that compute:
 *   - the ordered deck of cards given current form state (respecting branching)
 *   - whether a given card's answer is valid / "answered enough" to advance
 *   - a flat list of answers for the final summary card
 *
 * All rendering lives in the card components; this file has no React.
 */

import type { QuestionDefinition } from '@/config/questions';
import { intakeQuestions } from '@/config/questions';
import {
  getVisibleIntakeQuestions,
  type IntakeFormState,
  isFastTrackEligible,
} from '@/lib/questions/branching-rules';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Card =
  | { kind: 'question'; id: string; question: QuestionDefinition }
  | { kind: 'fast-track-decision' }
  | { kind: 'summary' };

/** Index into `intakeQuestions` — O(1) field/id lookup. */
const questionById: Record<string, QuestionDefinition> = Object.fromEntries(
  intakeQuestions.map((q) => [q.id, q]),
);

/**
 * The canonical ordering of intake questions as they should appear in the
 * card deck (sections A → B → C, with conditional sub-fields slotted in
 * after their parent). We don't use `intakeQuestions`' own ordering because
 * we want to control exactly where sub-fields land relative to their parent.
 */
const CANONICAL_ORDER: string[] = [
  // Section A
  'intake-q1',
  'intake-q2',
  'intake-q3',
  'intake-q4',
  'intake-q5',
  'intake-q6',
  'intake-q7',
  'intake-q8',
  'intake-q9',
  'intake-q9a',
  'intake-q9b',
  'intake-q10',
  'intake-q10a',
  'intake-q11',
  'intake-q11a',
  'intake-q12',
  'intake-q13',
  'intake-q14',
  'intake-q15a',
  'intake-q15b',
  'intake-q16',
  // Section B
  'intake-q17',
  'intake-q18',
  'intake-q19',
  'intake-q20',
  'intake-q21',
  // Section C
  'intake-q22',
  'intake-q23',
  'intake-q24',
  'intake-q25',
  'intake-q26',
  'intake-q27',
  'intake-q28',
  'intake-q29',
];

/** The question ID after which the fast-track decision card is inserted. */
export const FAST_TRACK_INSERT_AFTER = 'intake-q16';

// ─────────────────────────────────────────────────────────────────────────────
// Deck construction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the ordered deck of cards for the given form state.
 *
 * Behavior:
 *   - Respects branching: conditional sub-fields appear/disappear as answers
 *     change, and Section C is hidden when fast-track is active.
 *   - Inserts a "fast-track decision" card after Q16 iff:
 *       * the case is currently eligible for fast-track, AND
 *       * the user has not yet made a decision (fastTrackOptIn === undefined)
 *     Once the user decides (true/false), the card is omitted on the next
 *     build so they won't see it again unless eligibility changes and they
 *     reset their decision.
 *   - Always ends with a single "summary" card.
 */
export function buildDeck(state: IntakeFormState): Card[] {
  const visible = getVisibleIntakeQuestions(state);
  const deck: Card[] = [];

  for (const id of CANONICAL_ORDER) {
    if (!visible.has(id)) continue;
    const question = questionById[id];
    if (!question) continue;
    deck.push({ kind: 'question', id, question });

    if (id === FAST_TRACK_INSERT_AFTER && shouldShowFastTrackDecision(state)) {
      deck.push({ kind: 'fast-track-decision' });
    }
  }

  deck.push({ kind: 'summary' });
  return deck;
}

/**
 * Whether the fast-track decision card should be shown in the deck right now.
 *
 * Only shown when the user is eligible AND hasn't yet decided. Once they
 * decide, we persist their choice on `fastTrackOptIn` and drop the card.
 */
export function shouldShowFastTrackDecision(state: IntakeFormState): boolean {
  if (state.fastTrackOptIn !== undefined) return false;
  return isFastTrackEligible(state);
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is this field answered enough to advance past its card?
 *
 * - text/textarea: non-empty after trim
 * - select: non-empty string
 * - multiselect: array with ≥1 item
 * - number: numeric string or number ≥ 0
 * - currency: non-empty digits
 * - boolean: true or false (both count as answered)
 */
export function isAnswered(question: QuestionDefinition, value: unknown): boolean {
  switch (question.type) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' && value.trim().length > 0;
    case 'select':
      return typeof value === 'string' && value.length > 0;
    case 'multiselect':
      return Array.isArray(value) && value.length > 0;
    case 'number':
      if (typeof value === 'number') return Number.isFinite(value);
      if (typeof value === 'string') return value.trim().length > 0 && !Number.isNaN(Number(value));
      return false;
    case 'currency':
      if (typeof value === 'number') return Number.isFinite(value);
      if (typeof value === 'string') return /\d/.test(value);
      return false;
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return false;
  }
}

/**
 * Validate a single card's value. Returns an error message on failure or
 * null on success. Mirrors the relevant per-field rules from `intakeSchema`
 * so we can reject invalid answers *before* the final submit.
 */
export function validateCard(question: QuestionDefinition, value: unknown): string | null {
  // Optional fields with empty values pass (e.g. additionalNotes).
  if (!question.required && !isAnswered(question, value)) return null;

  if (!isAnswered(question, value)) {
    return question.type === 'multiselect'
      ? 'Select at least one option'
      : 'This field is required';
  }

  // Field-specific min-length rules (match intake-schema.ts).
  if (question.field === 'businessProblem' || question.field === 'howAiHelps') {
    if (typeof value === 'string' && value.trim().length < 10) {
      return 'Description must be at least 10 characters';
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

export interface SummaryEntry {
  id: string;
  field: string;
  label: string;
  section: string;
  displayValue: string;
}

/**
 * Flat list of answered cards for the summary screen, in canonical order.
 * Unanswered optional fields are skipped. Labels are human-readable.
 */
export function summaryEntries(state: IntakeFormState): SummaryEntry[] {
  const visible = getVisibleIntakeQuestions(state);
  const entries: SummaryEntry[] = [];

  for (const id of CANONICAL_ORDER) {
    if (!visible.has(id)) continue;
    const q = questionById[id];
    if (!q) continue;
    const value = state[q.field];
    if (!isAnswered(q, value)) continue;

    entries.push({
      id: q.id,
      field: q.field,
      label: q.label,
      section: q.section,
      displayValue: formatValue(q, value),
    });
  }

  return entries;
}

/** Turn a raw answer into a human-readable string for the summary card. */
export function formatValue(question: QuestionDefinition, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';

  const labelFor = (val: string): string => {
    const opt = question.options?.find((o) => o.value === val);
    return opt?.label ?? val;
  };

  switch (question.type) {
    case 'select':
      return typeof value === 'string' ? labelFor(value) : String(value);
    case 'multiselect':
      if (!Array.isArray(value)) return String(value);
      return value.map((v) => (typeof v === 'string' ? labelFor(v) : String(v))).join(', ');
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'currency':
      if (typeof value === 'string' && /^\d+$/.test(value)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(Number(value));
      }
      return String(value);
    default:
      return String(value);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Index math helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given the current card and a target state, find the nearest valid index
 * in the *new* deck so the user doesn't get thrown off when branching
 * changes the deck mid-flow.
 *
 * Rules:
 *   - If the current card's id still exists in the new deck → use its new index.
 *   - Otherwise → clamp to the last index strictly before where it used to be,
 *     so the user re-orients on the previous question rather than being
 *     teleported forward.
 */
/**
 * Decide which card should be rendered on each physical face (front/back)
 * of the flipping card, given the current deck state and flip state.
 *
 * Rules:
 *   - `parity` tracks *which physical face is currently facing the user*.
 *     0 = front is visible, 1 = back is visible. It changes only AFTER a
 *     flip animation completes — never during — so the face currently
 *     showing the user always holds `cardIndex`, the "current" card.
 *   - The non-visible face holds `pendingCardIndex` when a flip is in
 *     progress (the target card that will be revealed as the card passes
 *     90°). When no flip is in progress, both faces show the same card so
 *     nothing pops when parity eventually swaps.
 *
 * This is the piece that makes the flip read as the current question
 * rotating *away* while the next question comes into view — rather than
 * both faces snapping to the new content the moment the click lands.
 */
export function assignFaces(
  deck: Card[],
  cardIndex: number,
  pendingCardIndex: number | null,
  parity: 0 | 1,
): { front: Card | undefined; back: Card | undefined } {
  const currentCard = deck[cardIndex];
  const targetCard = pendingCardIndex !== null ? deck[pendingCardIndex] : currentCard;

  // parity 0 → front is visible → front holds the current card, back holds the target
  // parity 1 → back is visible → back holds the current card, front holds the target
  if (parity === 0) {
    return { front: currentCard, back: targetCard };
  }
  return { front: targetCard, back: currentCard };
}

export function remapIndex(prevDeck: Card[], prevIndex: number, nextDeck: Card[]): number {
  const prev = prevDeck[prevIndex];
  if (!prev) return Math.min(prevIndex, Math.max(0, nextDeck.length - 1));

  if (prev.kind === 'question') {
    const sameId = nextDeck.findIndex((c) => c.kind === 'question' && c.id === prev.id);
    if (sameId !== -1) return sameId;
  }
  if (prev.kind === 'fast-track-decision') {
    const idx = nextDeck.findIndex((c) => c.kind === 'fast-track-decision');
    if (idx !== -1) return idx;
  }
  if (prev.kind === 'summary') {
    return nextDeck.length - 1;
  }

  // Card disappeared — find the last card in nextDeck that also existed before
  // and was at or before prevIndex in the old deck.
  const priorIds = new Set<string>();
  for (let i = 0; i <= prevIndex && i < prevDeck.length; i++) {
    const c = prevDeck[i];
    if (c.kind === 'question') priorIds.add(c.id);
  }
  let fallback = 0;
  for (let i = 0; i < nextDeck.length; i++) {
    const c = nextDeck[i];
    if (c.kind === 'question' && priorIds.has(c.id)) fallback = i;
  }
  return fallback;
}
