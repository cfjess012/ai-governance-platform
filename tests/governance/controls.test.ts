import { describe, expect, it } from 'vitest';
import {
  applicableControls,
  CONTROLS_LIBRARY,
  controlsForEvidenceCategory,
  controlsForFramework,
  getControl,
} from '@/lib/governance/controls';

describe('CONTROLS_LIBRARY', () => {
  it('contains controls for the major frameworks', () => {
    const frameworks = new Set(CONTROLS_LIBRARY.map((c) => c.framework));
    expect(frameworks.has('EU AI Act')).toBe(true);
    expect(frameworks.has('GDPR')).toBe(true);
    expect(frameworks.has('NIST AI RMF 1.0')).toBe(true);
    expect(frameworks.has('Federal Reserve SR 11-7')).toBe(true);
    expect(frameworks.has('ISO/IEC 42001:2023')).toBe(true);
  });

  it('every control has a stable id, citation, and acceptable evidence', () => {
    for (const c of CONTROLS_LIBRARY) {
      expect(c.id).toBeTruthy();
      expect(c.citation).toBeTruthy();
      expect(c.acceptableEvidence.length).toBeGreaterThan(0);
    }
  });

  it('all control ids are unique', () => {
    const ids = CONTROLS_LIBRARY.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getControl', () => {
  it('finds known controls by id', () => {
    expect(getControl('eu-ai-act-art-9')?.title).toBe('Risk Management System');
    expect(getControl('gdpr-art-35')?.title).toBe('Data Protection Impact Assessment');
  });

  it('returns undefined for unknown ids', () => {
    expect(getControl('does-not-exist')).toBeUndefined();
  });
});

describe('controlsForFramework', () => {
  it('returns only controls for the named framework', () => {
    const gdpr = controlsForFramework('GDPR');
    expect(gdpr.length).toBeGreaterThan(0);
    expect(gdpr.every((c) => c.framework === 'GDPR')).toBe(true);
  });
});

describe('controlsForEvidenceCategory', () => {
  it('finds all controls a bias_audit could satisfy', () => {
    const matches = controlsForEvidenceCategory('bias_audit');
    expect(matches.some((c) => c.id === 'nist-rmf-measure-2-11')).toBe(true);
  });
});

describe('applicableControls', () => {
  it('only includes EU AI Act high-risk articles when tier is high', () => {
    const result = applicableControls(['EU AI Act'], 'high');
    const ids = result.map((c) => c.id);
    expect(ids).toContain('eu-ai-act-art-9');
    expect(ids).toContain('eu-ai-act-art-14');
  });

  it('only includes EU AI Act Article 50 when tier is limited (not high)', () => {
    const result = applicableControls(['EU AI Act'], 'limited');
    const ids = result.map((c) => c.id);
    expect(ids).toContain('eu-ai-act-art-50');
    expect(ids).not.toContain('eu-ai-act-art-9');
    expect(ids).not.toContain('eu-ai-act-art-14');
  });

  it('combines multiple frameworks without duplication', () => {
    const result = applicableControls(['EU AI Act', 'GDPR', 'NIST AI RMF 1.0'], 'high');
    const ids = result.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some((id) => id.startsWith('eu-ai-act'))).toBe(true);
    expect(ids.some((id) => id.startsWith('gdpr'))).toBe(true);
    expect(ids.some((id) => id.startsWith('nist-rmf'))).toBe(true);
  });

  it('handles unknown framework names gracefully', () => {
    const result = applicableControls(['Made-Up Framework'], undefined);
    expect(result).toEqual([]);
  });
});
