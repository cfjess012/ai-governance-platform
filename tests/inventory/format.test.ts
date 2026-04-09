import { describe, expect, it } from 'vitest';
import { parseOwner, toTitleCase } from '@/lib/inventory/format';

describe('toTitleCase', () => {
  it('converts snake_case to Title Case', () => {
    expect(toTitleCase('corporate_services')).toBe('Corporate Services');
    expect(toTitleCase('in_production')).toBe('In Production');
    expect(toTitleCase('idea_planning')).toBe('Idea Planning');
  });

  it('converts kebab-case to Title Case', () => {
    expect(toTitleCase('in-production')).toBe('In Production');
  });

  it('handles whitespace-separated words', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('lowercases internal letters', () => {
    expect(toTitleCase('SCREAMING_SNAKE')).toBe('Screaming Snake');
  });

  it('handles single words', () => {
    expect(toTitleCase('claims')).toBe('Claims');
  });

  it('returns empty string for nullish input', () => {
    expect(toTitleCase(undefined)).toBe('');
    expect(toTitleCase(null)).toBe('');
    expect(toTitleCase('')).toBe('');
  });

  it('collapses multiple separators', () => {
    expect(toTitleCase('a__b___c')).toBe('A B C');
    expect(toTitleCase('  hello   world  ')).toBe('Hello World');
  });
});

describe('parseOwner', () => {
  it('parses a name + email into initials, full display name, and full name', () => {
    const o = parseOwner('John Doe <john@example.com>');
    expect(o.initials).toBe('JD');
    expect(o.displayName).toBe('John Doe');
    expect(o.fullName).toBe('John Doe');
  });

  it('never includes the email in any returned field', () => {
    const o = parseOwner('Jane Smith <jane@example.com>');
    expect(o.initials).not.toContain('@');
    expect(o.displayName).not.toContain('@');
    expect(o.fullName).not.toContain('@');
    expect(o.displayName).not.toContain('example.com');
  });

  it('parses a name without an email', () => {
    const o = parseOwner('John Doe');
    expect(o.initials).toBe('JD');
    expect(o.displayName).toBe('John Doe');
    expect(o.fullName).toBe('John Doe');
  });

  // P5: "Sarah Chen" → avatar "SC", display "Sarah Chen"
  it('renders "Sarah Chen" correctly', () => {
    const o = parseOwner('Sarah Chen');
    expect(o.initials).toBe('SC');
    expect(o.displayName).toBe('Sarah Chen');
  });

  // P5: "James Park, Senior Business Analyst, Customer Operations" → "JP", "James Park"
  it('handles name with title and department (comma-separated)', () => {
    const o = parseOwner('James Park, Senior Business Analyst, Customer Operations');
    expect(o.initials).toBe('JP');
    expect(o.displayName).toBe('James Park');
  });

  it('handles a single name', () => {
    const o = parseOwner('Jane');
    expect(o.initials).toBe('J');
    expect(o.displayName).toBe('Jane');
    expect(o.fullName).toBe('Jane');
  });

  it('handles three or more name parts before comma (uses first two tokens)', () => {
    const o = parseOwner('Mary Jane Watson');
    expect(o.initials).toBe('MJ');
    expect(o.displayName).toBe('Mary Jane');
  });

  it('falls back to Unknown for empty / nullish input', () => {
    expect(parseOwner('').displayName).toBe('Unknown');
    expect(parseOwner(undefined).displayName).toBe('Unknown');
    expect(parseOwner(null).displayName).toBe('Unknown');
    expect(parseOwner('   ').displayName).toBe('Unknown');
  });

  it('falls back to Unknown when only an email is present', () => {
    expect(parseOwner('<just@email.com>').displayName).toBe('Unknown');
  });

  it('uppercases lowercase first names', () => {
    const o = parseOwner('jane doe');
    expect(o.initials).toBe('JD');
    expect(o.displayName).toBe('jane doe');
  });

  it('initials are always uppercase', () => {
    const o = parseOwner('ada lovelace');
    expect(o.initials).toBe(o.initials.toUpperCase());
  });

  it('strips bracketed suffixes that are not emails too (defensive)', () => {
    const o = parseOwner('John Doe <something>');
    expect(o.fullName).toBe('John Doe');
    expect(o.displayName).toBe('John Doe');
  });

  it('handles single-name string gracefully', () => {
    const o = parseOwner('Madonna');
    expect(o.initials).toBe('M');
    expect(o.displayName).toBe('Madonna');
  });
});
