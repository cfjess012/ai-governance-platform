/**
 * Prompt construction for the LLM-powered governance analysis.
 *
 * The system prompt forces the LLM into auditor mode: critical, explicit
 * about unknowns, no marketing language, JSON-only output.
 */

import type { HuggingFaceFetchResult } from '@/lib/integrations/huggingface/types';
import type { AIUseCase } from '@/types/inventory';
import type { ModelRecord } from '@/types/model';

/**
 * The system prompt — establishes the auditor persona and output contract.
 */
export const GOVERNANCE_SYSTEM_PROMPT = `You are an AI governance auditor. Your job is to produce a CRITICAL, GOVERNANCE-GRADE assessment of an AI model for an enterprise risk committee.

You are NOT a marketer. You are NOT the model vendor. You speak truth to power.

Your output rules:
1. Be CRITICAL. If something is unsafe or unclear, say it directly.
2. Be EXPLICIT about unknowns. If you don't know something, say "UNKNOWN" and explain WHY that gap matters for governance.
3. Use CONCRETE examples, not abstract claims. Never say "high performance" without evidence.
4. Use the structured JSON format exactly as specified — no extra prose, no markdown, no code fences.
5. Risk levels are LOW / MEDIUM / HIGH / UNKNOWN. Justify every rating.
6. Assume your reader is a risk committee member, not an engineer.
7. Prefer specifics (e.g., "may hallucinate citations in legal queries") over generalities (e.g., "may produce errors").
8. If the model is widely-known (GPT-4o, Claude 3.5, Llama 3, etc.), draw on what you actually know about its documented behaviors, published evaluations, and known limitations.
9. NEVER say a model is "safe" or "trustworthy" without evidence.
10. Output ONLY valid JSON matching the schema. No prose before or after.

Your output must be a single JSON object with this exact shape:

{
  "confidenceScore": <integer 0-100, your confidence in this assessment given available data>,
  "summary": "<one sentence verdict>",
  "strengths": ["<concrete strength 1>", ...],
  "concerns": ["<concrete concern 1>", ...],
  "recommendations": ["<concrete recommendation 1>", ...],
  "intendedUse": {
    "primaryUseCases": "<specific>",
    "prohibitedUseCases": "<explicit list>",
    "highRiskDomains": "<list domains and whether allowed>"
  },
  "userImpact": {
    "endUsers": "<who>",
    "potentiallyHarmed": "<who could be harmed>",
    "harmScenarios": "<realistic scenarios>"
  },
  "riskAssessment": {
    "hallucination": { "title": "Hallucination", "level": "LOW|MEDIUM|HIGH|UNKNOWN", "justification": "<...>" },
    "bias": { "title": "Bias", "level": "LOW|MEDIUM|HIGH|UNKNOWN", "justification": "<...>" },
    "security": { "title": "Security", "level": "LOW|MEDIUM|HIGH|UNKNOWN", "justification": "<...>" },
    "misuse": { "title": "Misuse", "level": "LOW|MEDIUM|HIGH|UNKNOWN", "justification": "<...>" }
  },
  "performance": {
    "knownBenchmarks": "<list or UNKNOWN>",
    "domainPerformance": "<by domain>",
    "failureCases": "<specific>",
    "confidenceCalibration": "<calibration issues>"
  },
  "trainingData": {
    "sources": "<broad categories>",
    "knownExclusions": "<what was excluded>",
    "biasSources": "<known biases>",
    "ipCopyrightRisk": "<assessment>"
  },
  "safety": {
    "contentModeration": "<approach>",
    "refusalBehavior": "<when does it refuse>",
    "guardrails": "<technical and policy>",
    "monitoringRecommendations": "<specific>"
  },
  "limitations": {
    "poorPerformanceAreas": "<specific>",
    "untrustedScenarios": "<when NOT to trust>",
    "overconfidencePatterns": "<patterns>"
  },
  "operationalGuidance": {
    "requiredHumanInLoop": "<scenarios>",
    "safeDeploymentPatterns": "<patterns>",
    "unsafeDeploymentPatterns": "<EXPLICIT unsafe patterns>"
  },
  "compliance": {
    "frameworkAlignment": "<NIST AI RMF, EU AI Act, etc.>",
    "dataHandling": "<considerations>",
    "auditRequirements": "<what audits are needed>"
  },
  "versioning": {
    "changesFromPriorVersions": "<changes or UNKNOWN>",
    "riskImplications": "<implications>"
  },
  "openGaps": [
    { "title": "<gap title>", "governanceRisk": "<why this matters>" }
  ]
}`;

/**
 * Build the user prompt with the model details.
 */
export function buildUserPrompt(
  model: ModelRecord,
  hfData?: HuggingFaceFetchResult,
  linkedUseCases?: AIUseCase[],
): string {
  const data = model.data;
  const hf = hfData?.metadata;

  const lines: string[] = [
    `Produce a governance audit for the following AI model:`,
    ``,
    `## Model Identity`,
    `- Name: ${data.name}`,
    `- Provider: ${data.provider}`,
    `- Model Type: ${data.modelType}`,
    `- Version: ${data.version ?? 'UNKNOWN'}`,
    `- License: ${data.licenseType}`,
    `- Hosting: ${data.hosting ?? 'UNKNOWN'}`,
    `- Status: ${data.status}`,
  ];

  if (data.huggingFaceModelId) {
    lines.push(`- Hugging Face ID: ${data.huggingFaceModelId}`);
  }

  if (hf) {
    lines.push(``, `## Hugging Face Metadata`);
    if (hf.architecture) lines.push(`- Architecture: ${hf.architecture}`);
    if (hf.parametersBillions !== null) {
      lines.push(`- Parameters: ${hf.parametersBillions}B`);
    }
    if (hf.contextWindow) lines.push(`- Context Window: ${hf.contextWindow} tokens`);
    if (hf.languages.length > 0) lines.push(`- Languages: ${hf.languages.join(', ')}`);
    if (hf.baseModels.length > 0) lines.push(`- Base Model: ${hf.baseModels.join(', ')}`);
    if (hf.datasets.length > 0) lines.push(`- Training Datasets: ${hf.datasets.join(', ')}`);
    if (hf.license) lines.push(`- HF License: ${hf.license}`);
    if (hf.benchmarks.length > 0) {
      lines.push(`- Reported Benchmarks:`);
      for (const b of hf.benchmarks.slice(0, 10)) {
        lines.push(`  - ${b.task} on ${b.dataset}: ${b.metric} = ${b.value}`);
      }
    }
  } else if (data.huggingFaceModelId) {
    lines.push(``, `## Hugging Face Metadata`, `UNKNOWN — fetch failed or pending`);
  }

  if (data.description) {
    lines.push(``, `## Vendor Description`, data.description);
  }

  if (data.knownLimitations) {
    lines.push(``, `## Stated Limitations`, data.knownLimitations);
  }

  if (data.dataRetentionPolicy) {
    lines.push(``, `## Data Retention`, data.dataRetentionPolicy);
  }

  if (data.approvedRegions && data.approvedRegions.length > 0) {
    lines.push(``, `## Approved Regions`, data.approvedRegions.join(', '));
  }

  if (linkedUseCases && linkedUseCases.length > 0) {
    lines.push(``, `## Active Deployments at This Organization`);
    for (const uc of linkedUseCases) {
      lines.push(
        `- "${uc.intake.useCaseName}" — ${uc.intake.businessArea} — owned by ${uc.intake.useCaseOwner}`,
      );
    }
  } else {
    lines.push(``, `## Active Deployments`, `No registered use cases reference this model yet.`);
  }

  // Truncated model card markdown if available (limit context size)
  if (hfData?.modelCardMarkdown) {
    const trimmed = hfData.modelCardMarkdown.slice(0, 6000);
    lines.push(``, `## Vendor Model Card Excerpt`, trimmed);
    if (hfData.modelCardMarkdown.length > 6000) {
      lines.push(`[truncated]`);
    }
  }

  lines.push(
    ``,
    `Produce the governance audit now. Output ONLY the JSON object. No prose. No markdown fences.`,
  );

  return lines.join('\n');
}
