/**
 * Display formatting helpers for the inventory table.
 *
 * Pure functions, no React, fully unit-testable.
 */

/**
 * Convert snake_case, kebab-case, or whitespace-separated strings into
 * Title Case. Returns an empty string for nullish input.
 *
 *   "corporate_services" → "Corporate Services"
 *   "in-production"      → "In Production"
 *   undefined            → ""
 */
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parsed owner display info derived from the raw `useCaseOwner` field.
 *
 * Owner strings come in several shapes the form has produced over time:
 *   - "John Doe <john@example.com>"
 *   - "John Doe"
 *   - "Jane"
 *   - ""           (missing)
 *
 * We never want to display the email itself in the table — initials and
 * a shortened "F. Last" representation are derived deterministically.
 */
export interface ParsedOwner {
  /** Up to 2 capital letters; never empty (falls back to "?"). */
  initials: string;
  /** "F. Last" shortened name, or single word if there's only one, or "Unknown". */
  displayName: string;
  /** The full name without the email — useful for tooltips/aria. */
  fullName: string;
}

/**
 * Strip an `<email>` suffix from an owner string and return whatever
 * remains as a trimmed name. Bracket-enclosed substrings are removed even
 * when they don't look like emails so we never accidentally show one.
 */
function stripEmail(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

/**
 * Parse a raw owner field into the pieces the table renders.
 *
 *   "John Doe <john@example.com>" → { initials: "JD", displayName: "J. Doe", fullName: "John Doe" }
 *   "John Doe"                    → { initials: "JD", displayName: "J. Doe", fullName: "John Doe" }
 *   "Jane"                        → { initials: "J",  displayName: "Jane",   fullName: "Jane" }
 *   "  "                          → { initials: "?",  displayName: "Unknown", fullName: "" }
 */
export function parseOwner(raw: string | null | undefined): ParsedOwner {
  if (!raw) return { initials: '?', displayName: 'Unknown', fullName: '' };

  const fullName = stripEmail(raw);
  if (!fullName) return { initials: '?', displayName: 'Unknown', fullName: '' };

  // Split on comma first — anything after the first comma is title/department.
  // Then split the name portion on whitespace to get first + last.
  const commaIndex = fullName.indexOf(',');
  const namePortion = commaIndex >= 0 ? fullName.slice(0, commaIndex).trim() : fullName;
  const parts = namePortion.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { initials: '?', displayName: 'Unknown', fullName: '' };
  }

  if (parts.length === 1) {
    const single = parts[0];
    return {
      initials: single[0].toUpperCase(),
      displayName: single[0].toUpperCase() + single.slice(1),
      fullName: namePortion,
    };
  }

  // Use first two tokens as first + last name (ignore middle names, titles, etc.)
  const first = parts[0];
  const last = parts[1];
  const initials = (first[0] + last[0]).toUpperCase();
  const displayName = `${first} ${last}`;

  return { initials, displayName, fullName: namePortion };
}
