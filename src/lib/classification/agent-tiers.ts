import type { AgentTierClassification } from '@/types/classification';

interface AgentTierInput {
  hasAgentCapabilities: boolean;
  agentAutonomyLevel?: 'none' | 'limited' | 'scoped' | 'broad' | 'unrestricted';
}

/**
 * Classify an AI use case against the internal Agent Tier framework.
 * Pure function — no side effects.
 */
export function classifyAgentTier(input: AgentTierInput): AgentTierClassification {
  if (!input.hasAgentCapabilities) {
    return {
      tier: 'low',
      level: 1,
      reason: 'No agent capabilities — standard human-in-the-loop system',
    };
  }

  switch (input.agentAutonomyLevel) {
    case 'none':
    case 'limited':
      return {
        tier: 'low',
        level: 1,
        reason:
          input.agentAutonomyLevel === 'none'
            ? 'Agent capabilities present but no autonomous actions'
            : 'Limited tool access with human approval for each action',
      };

    case 'scoped':
      return {
        tier: 'medium',
        level: 2,
        reason: 'Scoped autonomous actions with human review of outcomes',
      };

    case 'broad':
      return {
        tier: 'high',
        level: 3,
        reason: 'Broad tool access with autonomous actions — requires enhanced governance',
      };

    case 'unrestricted':
      return {
        tier: 'prohibited',
        level: 4,
        reason:
          'Unrestricted autonomous action with no human oversight — not permitted. Must be redesigned.',
      };

    default:
      return {
        tier: 'low',
        level: 1,
        reason: 'Agent autonomy level not specified — defaulting to low tier',
      };
  }
}
