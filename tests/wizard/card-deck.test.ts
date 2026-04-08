import { describe, expect, it } from 'vitest';
import { getQuestionByField } from '@/config/questions';
import type { IntakeFormState } from '@/lib/questions/branching-rules';
import {
  assignFaces,
  buildDeck,
  type Card,
  FAST_TRACK_INSERT_AFTER,
  formatValue,
  isAnswered,
  remapIndex,
  shouldShowFastTrackDecision,
  summaryEntries,
  validateCard,
} from '@/lib/wizard/card-deck';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum state to pass every fast-track eligibility check. */
function fastTrackEligibleState(overrides: Partial<IntakeFormState> = {}): IntakeFormState {
  return {
    thirdPartyInvolved: 'yes',
    aiType: ['generative_ai'],
    dataSensitivity: ['public'],
    highRiskTriggers: ['none_of_above'],
    whoUsesSystem: 'internal_only',
    whoAffected: 'internal_only',
    worstOutcome: 'minor',
    ...overrides,
  };
}

function q(field: string) {
  const question = getQuestionByField(field);
  if (!question) throw new Error(`Question not found for field: ${field}`);
  return question;
}

function questionCardIds(deck: Card[]): string[] {
  return deck
    .filter((c): c is Extract<Card, { kind: 'question' }> => c.kind === 'question')
    .map((c) => c.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildDeck
// ─────────────────────────────────────────────────────────────────────────────

describe('buildDeck', () => {
  it('ends with exactly one summary card', () => {
    const deck = buildDeck({});
    expect(deck[deck.length - 1].kind).toBe('summary');
    expect(deck.filter((c) => c.kind === 'summary').length).toBe(1);
  });

  it('starts with useCaseName (intake-q1)', () => {
    const deck = buildDeck({});
    const firstQuestion = deck.find((c) => c.kind === 'question');
    expect(firstQuestion).toBeDefined();
    if (firstQuestion?.kind === 'question') {
      expect(firstQuestion.id).toBe('intake-q1');
    }
  });

  it('omits Q9a/Q9b when thirdPartyInvolved is not "yes"', () => {
    const ids = questionCardIds(buildDeck({ thirdPartyInvolved: 'no' }));
    expect(ids).not.toContain('intake-q9a');
    expect(ids).not.toContain('intake-q9b');
  });

  it('includes Q9a/Q9b when thirdPartyInvolved === "yes"', () => {
    const ids = questionCardIds(buildDeck({ thirdPartyInvolved: 'yes' }));
    expect(ids).toContain('intake-q9a');
    expect(ids).toContain('intake-q9b');
  });

  it('places Q9a/Q9b immediately after Q9', () => {
    const ids = questionCardIds(buildDeck({ thirdPartyInvolved: 'yes' }));
    const q9Index = ids.indexOf('intake-q9');
    expect(ids[q9Index + 1]).toBe('intake-q9a');
    expect(ids[q9Index + 2]).toBe('intake-q9b');
  });

  it('omits Q10a when usesFoundationModel !== "yes"', () => {
    const ids = questionCardIds(buildDeck({ usesFoundationModel: 'no' }));
    expect(ids).not.toContain('intake-q10a');
  });

  it('includes Q10a when usesFoundationModel === "yes"', () => {
    const ids = questionCardIds(buildDeck({ usesFoundationModel: 'yes' }));
    expect(ids).toContain('intake-q10a');
  });

  it('omits Q11a unless deploymentRegions includes "other"', () => {
    const without = questionCardIds(buildDeck({ deploymentRegions: ['us_only'] }));
    expect(without).not.toContain('intake-q11a');

    const withOther = questionCardIds(buildDeck({ deploymentRegions: ['us_only', 'other'] }));
    expect(withOther).toContain('intake-q11a');
  });

  it('includes all Section C questions by default', () => {
    const ids = questionCardIds(buildDeck({}));
    for (const id of [
      'intake-q22',
      'intake-q23',
      'intake-q24',
      'intake-q25',
      'intake-q26',
      'intake-q27',
      'intake-q28',
      'intake-q29',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('hides Section C when user opts into fast-track AND is eligible', () => {
    const state = fastTrackEligibleState({ fastTrackOptIn: true });
    const ids = questionCardIds(buildDeck(state));
    expect(ids).not.toContain('intake-q22');
    expect(ids).not.toContain('intake-q29');
  });

  it('shows Section C when user opts in but is no longer eligible', () => {
    // They opted in, then changed worstOutcome to "serious" → no longer eligible
    // → Section C must come back so governance gets the full picture.
    const state = fastTrackEligibleState({ fastTrackOptIn: true, worstOutcome: 'serious' });
    const ids = questionCardIds(buildDeck(state));
    expect(ids).toContain('intake-q22');
  });

  it('shows Section C when user explicitly declined fast-track', () => {
    const state = fastTrackEligibleState({ fastTrackOptIn: false });
    const ids = questionCardIds(buildDeck(state));
    expect(ids).toContain('intake-q22');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fast-track decision card
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldShowFastTrackDecision', () => {
  it('false when state is empty (not eligible yet)', () => {
    expect(shouldShowFastTrackDecision({})).toBe(false);
  });

  it('true when eligible and user has not decided', () => {
    expect(shouldShowFastTrackDecision(fastTrackEligibleState())).toBe(true);
  });

  it('false when user already opted in', () => {
    expect(shouldShowFastTrackDecision(fastTrackEligibleState({ fastTrackOptIn: true }))).toBe(
      false,
    );
  });

  it('false when user already declined', () => {
    expect(shouldShowFastTrackDecision(fastTrackEligibleState({ fastTrackOptIn: false }))).toBe(
      false,
    );
  });

  it('false when not eligible regardless of undecided state', () => {
    const notEligible = fastTrackEligibleState({ worstOutcome: 'serious' });
    expect(shouldShowFastTrackDecision(notEligible)).toBe(false);
  });
});

describe('buildDeck — fast-track decision card insertion', () => {
  it('does not insert the decision card when not eligible', () => {
    const deck = buildDeck({});
    expect(deck.some((c) => c.kind === 'fast-track-decision')).toBe(false);
  });

  it('inserts the decision card right after Q16 when eligible and undecided', () => {
    const deck = buildDeck(fastTrackEligibleState());
    const q16Index = deck.findIndex(
      (c) => c.kind === 'question' && c.id === FAST_TRACK_INSERT_AFTER,
    );
    expect(q16Index).toBeGreaterThanOrEqual(0);
    expect(deck[q16Index + 1].kind).toBe('fast-track-decision');
  });

  it('does not insert the decision card once the user has decided', () => {
    const optedIn = buildDeck(fastTrackEligibleState({ fastTrackOptIn: true }));
    expect(optedIn.some((c) => c.kind === 'fast-track-decision')).toBe(false);

    const declined = buildDeck(fastTrackEligibleState({ fastTrackOptIn: false }));
    expect(declined.some((c) => c.kind === 'fast-track-decision')).toBe(false);
  });

  it('never inserts more than one decision card', () => {
    const deck = buildDeck(fastTrackEligibleState());
    expect(deck.filter((c) => c.kind === 'fast-track-decision').length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAnswered
// ─────────────────────────────────────────────────────────────────────────────

describe('isAnswered', () => {
  it('text: rejects empty and whitespace', () => {
    expect(isAnswered(q('useCaseName'), '')).toBe(false);
    expect(isAnswered(q('useCaseName'), '   ')).toBe(false);
    expect(isAnswered(q('useCaseName'), 'My Use Case')).toBe(true);
  });

  it('textarea: rejects empty, accepts non-empty', () => {
    expect(isAnswered(q('businessProblem'), '')).toBe(false);
    expect(isAnswered(q('businessProblem'), 'Short')).toBe(true);
  });

  it('select: rejects empty string', () => {
    expect(isAnswered(q('thirdPartyInvolved'), '')).toBe(false);
    expect(isAnswered(q('thirdPartyInvolved'), 'yes')).toBe(true);
  });

  it('multiselect: rejects empty or non-array', () => {
    expect(isAnswered(q('aiType'), [])).toBe(false);
    expect(isAnswered(q('aiType'), undefined)).toBe(false);
    expect(isAnswered(q('aiType'), ['generative_ai'])).toBe(true);
  });

  it('number: accepts numeric strings and numbers, rejects garbage', () => {
    const qn = q('valueEstimate'); // currency, not number — pick a real number field
    // valueEstimate is currency; use peopleAffectedCount? That's a select.
    // Test number logic directly with a synthetic question if needed:
    expect(isAnswered({ ...qn, type: 'number' }, '5')).toBe(true);
    expect(isAnswered({ ...qn, type: 'number' }, 5)).toBe(true);
    expect(isAnswered({ ...qn, type: 'number' }, '')).toBe(false);
    expect(isAnswered({ ...qn, type: 'number' }, 'abc')).toBe(false);
  });

  it('currency: requires at least one digit', () => {
    const qn = q('valueEstimate');
    expect(isAnswered(qn, '')).toBe(false);
    expect(isAnswered(qn, '$')).toBe(false);
    expect(isAnswered(qn, '$1,000')).toBe(true);
    expect(isAnswered(qn, '1000')).toBe(true);
  });

  it('boolean: accepts true and false but not undefined', () => {
    const qn = q('reflectedInBudget');
    expect(isAnswered(qn, true)).toBe(true);
    expect(isAnswered(qn, false)).toBe(true);
    expect(isAnswered(qn, undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateCard
// ─────────────────────────────────────────────────────────────────────────────

describe('validateCard', () => {
  it('returns error for required field that is unanswered', () => {
    expect(validateCard(q('useCaseName'), '')).toBe('This field is required');
  });

  it('returns multiselect-specific error for empty multiselect', () => {
    expect(validateCard(q('aiType'), [])).toBe('Select at least one option');
  });

  it('returns null for non-required, empty field (additionalNotes)', () => {
    expect(validateCard(q('additionalNotes'), '')).toBeNull();
    expect(validateCard(q('additionalNotes'), undefined)).toBeNull();
  });

  it('enforces min-length on businessProblem', () => {
    expect(validateCard(q('businessProblem'), 'tiny')).toBe(
      'Description must be at least 10 characters',
    );
    expect(validateCard(q('businessProblem'), 'this is long enough')).toBeNull();
  });

  it('enforces min-length on howAiHelps', () => {
    expect(validateCard(q('howAiHelps'), 'short')).toBe(
      'Description must be at least 10 characters',
    );
    expect(validateCard(q('howAiHelps'), 'this description is long enough')).toBeNull();
  });

  it('returns null for valid answers', () => {
    expect(validateCard(q('useCaseName'), 'My Use Case')).toBeNull();
    expect(validateCard(q('thirdPartyInvolved'), 'yes')).toBeNull();
    expect(validateCard(q('aiType'), ['generative_ai'])).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// summaryEntries
// ─────────────────────────────────────────────────────────────────────────────

describe('summaryEntries', () => {
  it('returns empty array when nothing is answered', () => {
    expect(summaryEntries({})).toEqual([]);
  });

  it('includes only answered, visible questions', () => {
    const state: IntakeFormState = {
      useCaseName: 'Test Case',
      useCaseOwner: 'Jane Doe',
      // thirdPartyInvolved not answered → Q9a, Q9b not visible
    };
    const entries = summaryEntries(state);
    const fields = entries.map((e) => e.field);
    expect(fields).toContain('useCaseName');
    expect(fields).toContain('useCaseOwner');
    expect(fields).not.toContain('vendorName');
  });

  it('formats select values using their labels', () => {
    const state: IntakeFormState = { thirdPartyInvolved: 'yes' };
    const entries = summaryEntries(state);
    const entry = entries.find((e) => e.field === 'thirdPartyInvolved');
    expect(entry).toBeDefined();
    // 'yes' label in the options list should not just be the raw value
    expect(entry?.displayValue).not.toBe('yes'); // should be mapped to label
  });

  it('formats multiselect values as comma-separated labels', () => {
    const state: IntakeFormState = { aiType: ['generative_ai', 'rag'] };
    const entries = summaryEntries(state);
    const entry = entries.find((e) => e.field === 'aiType');
    expect(entry?.displayValue).toContain(',');
  });

  it('skips unanswered optional fields', () => {
    const state: IntakeFormState = { useCaseName: 'X', additionalNotes: '' };
    const entries = summaryEntries(state);
    expect(entries.some((e) => e.field === 'additionalNotes')).toBe(false);
  });

  it('honors branching — hides section C entries when fast-track active', () => {
    const state = fastTrackEligibleState({
      fastTrackOptIn: true,
      strategicPriority: 'high_value', // this would normally show, but section C is hidden
    });
    const entries = summaryEntries(state);
    expect(entries.some((e) => e.field === 'strategicPriority')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatValue
// ─────────────────────────────────────────────────────────────────────────────

describe('formatValue', () => {
  it('returns em-dash for nullish', () => {
    expect(formatValue(q('useCaseName'), undefined)).toBe('—');
    expect(formatValue(q('useCaseName'), null)).toBe('—');
    expect(formatValue(q('useCaseName'), '')).toBe('—');
  });

  it('formats boolean as Yes/No', () => {
    expect(formatValue(q('reflectedInBudget'), true)).toBe('Yes');
    expect(formatValue(q('reflectedInBudget'), false)).toBe('No');
  });

  it('formats currency string as USD', () => {
    expect(formatValue(q('valueEstimate'), '50000')).toBe('$50,000');
  });

  it('passes text through', () => {
    expect(formatValue(q('useCaseName'), 'Hello')).toBe('Hello');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// remapIndex
// ─────────────────────────────────────────────────────────────────────────────

describe('remapIndex', () => {
  it('keeps the user on the same question when its ID still exists', () => {
    const stateA = buildDeck({});
    // Pick index of intake-q5 (businessProblem)
    const prevIndex = stateA.findIndex((c) => c.kind === 'question' && c.id === 'intake-q5');
    const stateB = buildDeck({ thirdPartyInvolved: 'yes' }); // deck grew (Q9a/Q9b added later)
    const newIndex = remapIndex(stateA, prevIndex, stateB);
    const card = stateB[newIndex];
    expect(card.kind).toBe('question');
    if (card.kind === 'question') expect(card.id).toBe('intake-q5');
  });

  it('falls back to nearest prior question when current card vanishes', () => {
    // Start in the middle of section C with section C visible
    const prevDeck = buildDeck({});
    const q22Index = prevDeck.findIndex((c) => c.kind === 'question' && c.id === 'intake-q22');
    // Now hide section C via fast-track
    const nextDeck = buildDeck(fastTrackEligibleState({ fastTrackOptIn: true }));
    const newIndex = remapIndex(prevDeck, q22Index, nextDeck);
    const card = nextDeck[newIndex];
    // Should land on the last question that still exists — a section B question
    expect(card.kind).toBe('question');
  });

  it('handles summary card by returning last index', () => {
    const prevDeck = buildDeck({});
    const prevIndex = prevDeck.length - 1;
    expect(prevDeck[prevIndex].kind).toBe('summary');
    const nextDeck = buildDeck({ thirdPartyInvolved: 'yes' });
    expect(remapIndex(prevDeck, prevIndex, nextDeck)).toBe(nextDeck.length - 1);
  });

  it('handles out-of-bounds prevIndex safely', () => {
    const prevDeck = buildDeck({});
    const nextDeck = buildDeck({});
    const newIndex = remapIndex(prevDeck, 9999, nextDeck);
    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeLessThan(nextDeck.length);
  });

  it('finds the fast-track decision card across rebuilds', () => {
    const prevDeck = buildDeck(fastTrackEligibleState());
    const ftIndex = prevDeck.findIndex((c) => c.kind === 'fast-track-decision');
    expect(ftIndex).toBeGreaterThanOrEqual(0);
    // Rebuild with same state — decision card still present, same logical slot
    const nextDeck = buildDeck(fastTrackEligibleState());
    const newIndex = remapIndex(prevDeck, ftIndex, nextDeck);
    expect(nextDeck[newIndex].kind).toBe('fast-track-decision');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assignFaces — the piece that was broken and made the flip look "goofy"
// ─────────────────────────────────────────────────────────────────────────────

describe('assignFaces', () => {
  // Use a small synthetic deck of real question cards for readable assertions.
  const deck = buildDeck({});
  const getId = (card: Card | undefined): string | undefined =>
    card?.kind === 'question' ? card.id : card?.kind;

  describe('at rest (no flip in progress)', () => {
    it('parity 0: both faces show the current card so nothing can pop', () => {
      const { front, back } = assignFaces(deck, 0, null, 0);
      expect(getId(front)).toBe(getId(deck[0]));
      expect(getId(back)).toBe(getId(deck[0]));
    });

    it('parity 1: both faces show the current card so nothing can pop', () => {
      const { front, back } = assignFaces(deck, 3, null, 1);
      expect(getId(front)).toBe(getId(deck[3]));
      expect(getId(back)).toBe(getId(deck[3]));
    });
  });

  describe('during a forward flip from parity 0', () => {
    // The card is rotating away. Parity stays 0 until the flip completes.
    // During the animation the user still sees the front face (old card)
    // for the first half, then the back face (new card) for the second half.
    it('front keeps the current card; back loads the pending target', () => {
      const { front, back } = assignFaces(deck, 0, 1, 0);
      expect(getId(front)).toBe(getId(deck[0])); // current — NOT the target
      expect(getId(back)).toBe(getId(deck[1])); // target — revealed past 90°
    });

    it('front is never pre-swapped to the target (regression: the original goofy bug)', () => {
      const { front } = assignFaces(deck, 0, 1, 0);
      expect(getId(front)).not.toBe(getId(deck[1]));
    });
  });

  describe('after a forward flip completes (parity has flipped to 1)', () => {
    // Post-timeout: cardIndex has advanced to the target, pending is null,
    // parity is now 1. The visible face (back) must still hold the current card.
    it('back holds the new current card; front is harmless', () => {
      const { front, back } = assignFaces(deck, 1, null, 1);
      expect(getId(back)).toBe(getId(deck[1])); // visible face shows current
      expect(getId(front)).toBe(getId(deck[1])); // doesn't matter — hidden
    });
  });

  describe('during a second consecutive forward flip (parity 1 → targeting parity 0)', () => {
    // Now the back face is currently visible. The front face is about to
    // rotate into view. Back must keep the current card; front loads target.
    it('back keeps the current card; front loads the pending target', () => {
      const { front, back } = assignFaces(deck, 1, 2, 1);
      expect(getId(back)).toBe(getId(deck[1])); // current stays on the visible face
      expect(getId(front)).toBe(getId(deck[2])); // target on the incoming face
    });
  });

  describe('during a backward flip', () => {
    // Backward flip is just a forward flip with opposite rotation sign —
    // assignFaces doesn't care about direction, only parity.
    it('parity 0: front keeps current, back loads target', () => {
      const { front, back } = assignFaces(deck, 5, 4, 0);
      expect(getId(front)).toBe(getId(deck[5]));
      expect(getId(back)).toBe(getId(deck[4]));
    });

    it('parity 1: back keeps current, front loads target', () => {
      const { front, back } = assignFaces(deck, 5, 4, 1);
      expect(getId(back)).toBe(getId(deck[5]));
      expect(getId(front)).toBe(getId(deck[4]));
    });
  });

  describe('full forward-flip walkthrough (regression protection)', () => {
    it('every step of a flip keeps the currently-visible face showing the right card', () => {
      // Initial state
      let cardIndex = 0;
      let parity: 0 | 1 = 0;
      let pending: number | null = null;

      // Rest → visible face (front, parity 0) shows card 0
      expect(getId(assignFaces(deck, cardIndex, pending, parity).front)).toBe(getId(deck[0]));

      // User clicks Next. flipTo sets pendingCardIndex=1 but parity stays 0.
      pending = 1;
      {
        const faces = assignFaces(deck, cardIndex, pending, parity);
        // Visible (front) must still show card 0 as it rotates away
        expect(getId(faces.front)).toBe(getId(deck[0]));
        // Back is pre-loaded with card 1 — revealed past the 90° mark
        expect(getId(faces.back)).toBe(getId(deck[1]));
      }

      // setTimeout fires: cardIndex advances, pending clears, parity flips
      cardIndex = 1;
      pending = null;
      parity = 1;
      {
        const faces = assignFaces(deck, cardIndex, pending, parity);
        // Visible (back) shows card 1 — no pop, no snap
        expect(getId(faces.back)).toBe(getId(deck[1]));
      }

      // Another forward flip
      pending = 2;
      {
        const faces = assignFaces(deck, cardIndex, pending, parity);
        expect(getId(faces.back)).toBe(getId(deck[1])); // old card stays visible
        expect(getId(faces.front)).toBe(getId(deck[2])); // new card on the incoming face
      }

      cardIndex = 2;
      pending = null;
      parity = 0;
      {
        const faces = assignFaces(deck, cardIndex, pending, parity);
        expect(getId(faces.front)).toBe(getId(deck[2]));
      }
    });
  });
});
