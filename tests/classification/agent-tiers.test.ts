import { describe, expect, it } from 'vitest';
import { classifyAgentTier } from '@/lib/classification/agent-tiers';

describe('Agent Tier Classification', () => {
  it('returns low tier when no agent capabilities', () => {
    const result = classifyAgentTier({ hasAgentCapabilities: false });
    expect(result.tier).toBe('low');
    expect(result.level).toBe(1);
  });

  it('returns low tier for autonomy level "none"', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: 'none',
    });
    expect(result.tier).toBe('low');
    expect(result.level).toBe(1);
  });

  it('returns low tier for autonomy level "limited"', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: 'limited',
    });
    expect(result.tier).toBe('low');
    expect(result.level).toBe(1);
  });

  it('returns medium tier for autonomy level "scoped"', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: 'scoped',
    });
    expect(result.tier).toBe('medium');
    expect(result.level).toBe(2);
  });

  it('returns high tier for autonomy level "broad"', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: 'broad',
    });
    expect(result.tier).toBe('high');
    expect(result.level).toBe(3);
  });

  it('returns prohibited tier for autonomy level "unrestricted"', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: 'unrestricted',
    });
    expect(result.tier).toBe('prohibited');
    expect(result.level).toBe(4);
  });

  it('defaults to low when agent capabilities true but level undefined', () => {
    const result = classifyAgentTier({
      hasAgentCapabilities: true,
      agentAutonomyLevel: undefined,
    });
    expect(result.tier).toBe('low');
    expect(result.level).toBe(1);
  });
});
