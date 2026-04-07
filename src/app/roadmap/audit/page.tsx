'use client';

import Link from 'next/link';
import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Rating = 'strong' | 'adequate' | 'gap' | 'missing';
type Category =
  | 'identification'
  | 'ownership'
  | 'purpose'
  | 'technical'
  | 'data'
  | 'risk'
  | 'oversight'
  | 'compliance'
  | 'fairness'
  | 'transparency'
  | 'third-party'
  | 'monitoring'
  | 'stakeholder'
  | 'financial-services'
  | 'emerging';

interface AuditItem {
  field: string;
  currentQuestion: string | null;
  rating: Rating;
  frameworks: string[];
  finding: string;
  recommendation: string | null;
}

interface AuditCategory {
  id: Category;
  label: string;
  items: AuditItem[];
}

/* ------------------------------------------------------------------ */
/*  Audit Data                                                         */
/* ------------------------------------------------------------------ */

const auditCategories: AuditCategory[] = [
  {
    id: 'identification',
    label: 'System Identification',
    items: [
      {
        field: 'AI System Name',
        currentQuestion: 'Q1 — Use Case Name',
        rating: 'strong',
        frameworks: ['EU AI Act Annex VIII', 'ISO 42001', 'NIST AI RMF', 'SR 11-7'],
        finding: 'Covered. Clear name field with guidance to describe the problem being solved.',
        recommendation: null,
      },
      {
        field: 'Unique System Identifier',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['EU AI Act Annex VIII A.4', 'ISO 42001', 'SR 11-7'],
        finding:
          'System generates an ID post-submission, but there is no field for external reference numbers or version identifiers.',
        recommendation:
          'Add an optional "External Reference ID" field for systems already tracked in other tools (ServiceNow, Jira, etc.).',
      },
      {
        field: 'System Status / Lifecycle',
        currentQuestion: 'Q12 — Current Lifecycle Stage',
        rating: 'strong',
        frameworks: ['EU AI Act Annex VIII A.7', 'SR 11-7', 'ISO 42001'],
        finding: 'Covered with 5 clear lifecycle stages from idea to retirement.',
        recommendation: null,
      },
      {
        field: 'Date of Registration / Last Modification',
        currentQuestion: null,
        rating: 'adequate',
        frameworks: ['EU AI Act Annex VIII', 'Colorado AI Act'],
        finding:
          'System auto-captures creation timestamp but does not ask about the date the AI system was first deployed or last substantially modified.',
        recommendation:
          'Add "Date first deployed" (if already in production) and track modification dates automatically.',
      },
    ],
  },
  {
    id: 'ownership',
    label: 'Organizational Ownership & Accountability',
    items: [
      {
        field: 'System Owner',
        currentQuestion: 'Q2 — Use Case Owner',
        rating: 'strong',
        frameworks: ['NIST AI RMF GOVERN 2.1', 'ISO 42001', 'NAIC', 'SR 11-7'],
        finding: 'Covered. Free text field for name and role.',
        recommendation: null,
      },
      {
        field: 'Executive Sponsor',
        currentQuestion: 'Q3 — Executive Sponsor',
        rating: 'strong',
        frameworks: ['NIST AI RMF GOVERN 2.3', 'NAIC', 'ISO 42001'],
        finding: 'Covered. Required for all use cases.',
        recommendation: null,
      },
      {
        field: 'Business Unit / Department',
        currentQuestion: 'Q4 — Business Area',
        rating: 'strong',
        frameworks: ['NIST AI RMF', 'ISO 42001', 'NAIC', 'SR 11-7'],
        finding: 'Covered with 17 business area options mapped to risk classification.',
        recommendation: null,
      },
      {
        field: 'Provider / Developer Name & Contact',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['EU AI Act Annex VIII A.1', 'Colorado AI Act'],
        finding:
          'No field captures the developer entity (internal team or vendor) with contact details. Critical for EU AI Act database registration.',
        recommendation:
          'Add "Development Team / Provider" with name, department, and contact email. This is mandatory for EU AI Act Annex VIII.',
      },
      {
        field: 'Deployer Name & Contact',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['EU AI Act Annex VIII C.1', 'Colorado AI Act'],
        finding:
          'EU AI Act distinguishes between "provider" and "deployer." No deployer field exists.',
        recommendation:
          'Add "Deployer Organization" field. For in-house systems, auto-populate with company name. For vendor systems, capture deployer separately.',
      },
    ],
  },
  {
    id: 'purpose',
    label: 'Purpose & Intended Use',
    items: [
      {
        field: 'Intended Purpose',
        currentQuestion: 'Q5 — Business Problem + Q6 — How AI Helps',
        rating: 'strong',
        frameworks: [
          'EU AI Act Annex VIII A.5',
          'NIST AI RMF MAP 1.1',
          'ISO 42001',
          'OECD',
          'Colorado AI Act',
        ],
        finding:
          'Well covered with two complementary fields that together describe the full purpose.',
        recommendation: null,
      },
      {
        field: 'Target Users / Operators',
        currentQuestion: 'Q15a — Who Uses This System',
        rating: 'adequate',
        frameworks: ['NIST AI RMF MAP 3.4', 'OECD', 'Singapore MGF'],
        finding:
          'Captures user type (internal/external/both) but not the specific user roles or required competency level.',
        recommendation:
          'Consider adding "Primary User Roles" (e.g., claims adjuster, customer service agent) for better context.',
      },
      {
        field: 'Affected Population',
        currentQuestion: 'Q15b — Who Is Affected + Q20 — People Affected Count',
        rating: 'strong',
        frameworks: ['OECD', 'Canada AIA', 'NIST AI RMF MAP 5.1'],
        finding:
          'Excellent. Captures both the type and scale of affected population. Above average for the industry.',
        recommendation: null,
      },
      {
        field: 'Foreseeable Misuse Scenarios',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['EU AI Act', 'Colorado AI Act', 'NIST AI RMF MAP 1.1'],
        finding:
          'No field asks about reasonably foreseeable misuse. EU AI Act requires providers to consider this.',
        recommendation:
          'Add "Known risks of misuse" as a textarea — even a brief answer flags awareness and triggers governance attention.',
      },
      {
        field: 'Geographic Scope',
        currentQuestion: 'Q11 — Deployment Regions',
        rating: 'strong',
        frameworks: ['EU AI Act Annex VIII A.10', 'Colorado AI Act'],
        finding:
          'Covered with multiselect for US, EU/EEA, UK, Canada, Other. Correctly triggers EU AI Act obligations.',
        recommendation: null,
      },
    ],
  },
  {
    id: 'technical',
    label: 'AI System Technical Characteristics',
    items: [
      {
        field: 'AI Technology Type',
        currentQuestion: 'Q7 — AI Type',
        rating: 'strong',
        frameworks: ['OECD', 'Canada AIA', 'ISO 42001'],
        finding:
          'Covered with 7 options including generative AI, predictive, RPA, AI agent, computer vision, RAG.',
        recommendation: null,
      },
      {
        field: 'Foundation Model Usage',
        currentQuestion: 'Q10 — Uses Foundation Model + Q10a — Which Models',
        rating: 'strong',
        frameworks: ['EU AI Act GPAI provisions', 'Emerging'],
        finding:
          'Excellent. Two-part question with model registry integration for specific model selection.',
        recommendation: null,
      },
      {
        field: 'Autonomy Level',
        currentQuestion: 'Q18 — Human Oversight Level',
        rating: 'strong',
        frameworks: ['Canada AIA', 'NIST AI RMF MAP 3.5', 'Singapore MGF'],
        finding:
          'Covered with 5 well-defined oversight levels from "human decides everything" to "fully autonomous."',
        recommendation: null,
      },
      {
        field: 'Agent Capabilities (tool use, planning, multi-agent)',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Singapore Agentic AI MGF 2026', 'OWASP Agentic AI Top 10', 'Emerging'],
        finding:
          'AI type captures "AI Agent" as a category, but no follow-up questions about agent-specific capabilities: tool access, planning depth, multi-agent orchestration, guardrails.',
        recommendation:
          'Add conditional agent questions: "What tools/APIs can the agent access?", "Is this part of a multi-agent system?", "What guardrails/boundaries are defined?"',
      },
      {
        field: 'System Interconnections & Dependencies',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NIST AI RMF MAP 4.1', 'Emerging'],
        finding:
          'No field captures upstream/downstream system dependencies. Critical for cascading failure analysis.',
        recommendation:
          'Add "What systems feed data into this AI?" and "What systems consume this AI\'s outputs?" — even a brief text answer creates a dependency map.',
      },
      {
        field: 'Fine-tuning / Customization Status',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Emerging (supply chain)', 'EU AI Act GPAI'],
        finding:
          'High-risk triggers include "Fine-tuning a foundation model" but there\'s no detail on what was fine-tuned, with what data, or how.',
        recommendation:
          'Add conditional follow-up when fine-tuning is selected: "What data was used for fine-tuning?" and "Was the fine-tuned model independently evaluated?"',
      },
    ],
  },
  {
    id: 'data',
    label: 'Data & Input Characteristics',
    items: [
      {
        field: 'Data Sensitivity Classification',
        currentQuestion: 'Q17 — Data Sensitivity',
        rating: 'strong',
        frameworks: ['Colorado AI Act', 'EU AI Act', 'ISO 42001', 'Canada AIA'],
        finding:
          'Excellent. Multiselect with 7 granular sensitivity levels including health info and regulated financial data.',
        recommendation: null,
      },
      {
        field: 'Data Sources & Provenance',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NIST AI RMF MAP 1.6', 'OECD', 'Canada AIA', 'ISO 42001', 'SR 11-7'],
        finding:
          'No field asks where the data comes from. Data provenance is required by 5+ frameworks and is fundamental to supply chain transparency.',
        recommendation:
          'Add "Primary data sources" (multiselect: internal databases, customer-provided, third-party vendor, public/web scraped, synthetic) with optional text detail.',
      },
      {
        field: 'Training Data Description',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Colorado AI Act', 'EU AI Act', 'ISO 42001'],
        finding:
          'No field captures training data information. Colorado AI Act requires developers to disclose training data summaries.',
        recommendation:
          'Add "Training data summary" textarea — even "uses vendor-provided pre-trained model" is informative.',
      },
      {
        field: 'Protected Characteristics in Data',
        currentQuestion: 'Q19 — Differential Treatment',
        rating: 'adequate',
        frameworks: ['NYC LL144', 'Colorado AI Act', 'Canada AIA', 'CFPB'],
        finding:
          'Asks about differential treatment potential but does not specifically ask whether protected characteristics (race, gender, age, disability) are present in the data.',
        recommendation:
          'Add "Does the input data contain protected characteristics (directly or as proxies)?" with yes/no/unknown options.',
      },
      {
        field: 'Unstructured Data Usage',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Canada AIA'],
        finding:
          'Not captured at intake. Asked later in the pre-production assessment but relevant for early risk signaling.',
        recommendation:
          'Consider adding to intake for GenAI/RAG use cases — unstructured data significantly changes the risk profile.',
      },
    ],
  },
  {
    id: 'risk',
    label: 'Risk Classification & Categorization',
    items: [
      {
        field: 'EU AI Act Risk Level',
        currentQuestion: 'Auto-classified from intake answers',
        rating: 'strong',
        frameworks: ['EU AI Act Articles 5, 6, 50, 52'],
        finding:
          'Excellent. Real-time auto-classification shown in sidebar as user fills the form. Above industry standard.',
        recommendation: null,
      },
      {
        field: 'High-Risk Activity Triggers',
        currentQuestion: 'Q14 — High-Risk Decision Triggers',
        rating: 'strong',
        frameworks: ['EU AI Act Annex III', 'NAIC', 'Colorado AI Act'],
        finding:
          'Well designed with 9 specific triggers mapped to regulatory frameworks. Exclusive "none of the above" option prevents blank answers.',
        recommendation: null,
      },
      {
        field: 'Worst-Case Impact',
        currentQuestion: 'Q16 — Worst Outcome',
        rating: 'strong',
        frameworks: ['NIST AI RMF', 'Canada AIA', 'ISO 42001'],
        finding:
          'Good 4-level scale with insurance-specific examples (wrong claim decision, unfair pricing).',
        recommendation: null,
      },
      {
        field: 'Consequential Decision Classification',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Colorado AI Act', 'NYC LL144'],
        finding:
          'High-risk triggers cover some consequential decisions, but the Colorado AI Act has a specific legal definition of "consequential decision" (employment, education, financial, housing, insurance, healthcare, legal, government services) that isn\'t explicitly mapped.',
        recommendation:
          'Add a "Does this system contribute to a consequential decision?" yes/no with Colorado AI Act definition in help text.',
      },
      {
        field: 'Fundamental Rights Impact',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['EU AI Act', 'OECD'],
        finding:
          'No field asks about impact on fundamental rights (privacy, non-discrimination, freedom of expression, etc.). EU AI Act requires FRIA for high-risk systems.',
        recommendation:
          'Add "Could this system impact fundamental rights?" with checklist: privacy, non-discrimination, freedom of expression, due process, human dignity.',
      },
      {
        field: 'Environmental Impact',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['OECD', 'Emerging (ESG)'],
        finding:
          'No environmental or sustainability consideration. Emerging trend — OECD AI Principles include environmental impact.',
        recommendation:
          'Add "Estimated compute intensity" (low/medium/high/unknown) — lightweight signal for sustainability awareness. Low priority but forward-looking.',
      },
    ],
  },
  {
    id: 'oversight',
    label: 'Human Oversight & Governance',
    items: [
      {
        field: 'Human Oversight Level',
        currentQuestion: 'Q18 — Human Oversight Level',
        rating: 'strong',
        frameworks: ['NIST AI RMF MAP 3.5', 'EU AI Act', 'Singapore MGF', 'Canada AIA'],
        finding:
          'Excellent phrasing: "Describe how things actually work, not how they are designed to work on paper." This honesty prompt is a best practice.',
        recommendation: null,
      },
      {
        field: 'Override / Rollback Mechanism',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['ISO 42001 A.7', 'Singapore Agentic AI MGF'],
        finding:
          'No field asks whether the system can be overridden or rolled back. Critical for agentic AI and automated decision systems.',
        recommendation:
          'Add "Can a human override or reverse this system\'s actions?" (yes easily / yes with effort / no / not applicable).',
      },
      {
        field: 'Appeal / Redress Mechanism',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Canada AIA', 'NYC LL144', 'Colorado AI Act', 'EU AI Act'],
        finding:
          'No field asks whether affected individuals can appeal or seek redress. Required by multiple US state laws and EU AI Act for high-risk systems.',
        recommendation:
          'Add "Is there a process for affected individuals to challenge or appeal this system\'s decisions?" (yes / planned / no / not applicable).',
      },
      {
        field: 'Alternative Non-AI Process',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['NYC LL144', 'Canada AIA'],
        finding:
          'No field asks whether a non-AI alternative exists. Important for assessing proportionality and providing human fallback.',
        recommendation:
          'Add "Is a non-AI alternative process available?" — helps assess whether AI is proportionate and provides fallback option.',
      },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Certification',
    items: [
      {
        field: 'Applicable Regulations',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['NIST AI RMF GOVERN 1.1', 'ISO 42001 A.11'],
        finding:
          "The system auto-detects EU AI Act applicability from region/activity, but doesn't ask the submitter to identify other applicable regulations (state insurance laws, GDPR, HIPAA, etc.).",
        recommendation:
          'Add "Known applicable regulations" multiselect (EU AI Act, GDPR, HIPAA, NAIC, state insurance regulations, NYC LL144, Colorado AI Act, other).',
      },
      {
        field: 'Prior Governance Review',
        currentQuestion: 'Q13 — Previously Reviewed',
        rating: 'adequate',
        frameworks: ['Internal governance'],
        finding:
          'Captures whether previously reviewed but not the outcome or findings of that review.',
        recommendation:
          'Add conditional follow-up: "What was the outcome?" (approved, conditional, changes required) and "Reference ID of prior review."',
      },
      {
        field: 'DPIA / Privacy Assessment Status',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['EU AI Act Annex VIII C.5', 'GDPR'],
        finding:
          'No field asks whether a Data Protection Impact Assessment has been conducted. Required for EU AI Act high-risk registration.',
        recommendation:
          'Add "Has a DPIA been completed?" (yes / in progress / not started / not required) — links governance to privacy review.',
      },
    ],
  },
  {
    id: 'fairness',
    label: 'Fairness, Bias & Discrimination',
    items: [
      {
        field: 'Differential Treatment Potential',
        currentQuestion: 'Q19 — Differential Treatment',
        rating: 'strong',
        frameworks: ['NYC LL144', 'Colorado AI Act', 'CFPB', 'NAIC'],
        finding:
          'Well-designed 5-point scale from "no" to "yes, directly." Good for early risk flagging.',
        recommendation: null,
      },
      {
        field: 'Bias Testing Status',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Colorado AI Act', 'NYC LL144', 'NIST AI RMF MAP 2.3', 'NAIC'],
        finding:
          'Asks about bias potential but not whether bias testing has been performed. NYC LL144 requires published bias audits.',
        recommendation:
          'Add "Has bias testing been performed?" (yes / planned / no / not applicable) with conditional "Date of last bias audit."',
      },
      {
        field: 'Adverse Action Notice Capability',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['CFPB ECOA', 'OCC'],
        finding:
          'For financial services AI that denies applications or changes pricing — no field asks whether the system can generate adverse action explanations.',
        recommendation:
          'Add for insurance/credit/lending triggers: "Can this system generate adverse action notices explaining why a decision was made?"',
      },
    ],
  },
  {
    id: 'transparency',
    label: 'Transparency & Disclosure',
    items: [
      {
        field: 'User Notification of AI Use',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NYC LL144', 'Colorado AI Act', 'EU AI Act Article 50', 'NAIC'],
        finding:
          'No field asks whether users/affected individuals are informed that AI is being used. Required by EU AI Act Art. 50 and Colorado AI Act.',
        recommendation:
          'Add "Are users informed that AI is being used in this process?" (yes / planned / no / not applicable). Critical compliance gap.',
      },
      {
        field: 'Explainability Approach',
        currentQuestion: 'Q9b — Auditability (vendor only)',
        rating: 'gap',
        frameworks: ['NAIC', 'CFPB', 'SR 11-7', 'ISO 42001'],
        finding:
          'Auditability is asked only for third-party systems. No general question about explainability for all AI systems.',
        recommendation:
          'Add for all systems: "Can this system explain its outputs/decisions?" (fully explainable / partially / not explainable / not applicable).',
      },
    ],
  },
  {
    id: 'third-party',
    label: 'Third-Party & Supply Chain',
    items: [
      {
        field: 'Third-Party Involvement',
        currentQuestion: 'Q9 — Third-Party Involved + Q9a — Vendor Name',
        rating: 'adequate',
        frameworks: ['NIST AI RMF GOVERN 6.1', 'ISO 42001 A.9', 'SR 11-7', 'NAIC'],
        finding:
          'Captures vendor name and auditability. Good for initial triage but light on vendor risk details.',
        recommendation: null,
      },
      {
        field: 'Foundation Model Provider & Version',
        currentQuestion: 'Q10a — Which Models (from registry)',
        rating: 'strong',
        frameworks: ['EU AI Act GPAI', 'Emerging'],
        finding:
          'Model registry integration is a strength — captures specific model with metadata from the registry.',
        recommendation: null,
      },
      {
        field: 'IP / Licensing Terms',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NIST AI RMF GOVERN 6.1', 'Emerging (IP/copyright)'],
        finding:
          'No field captures IP or licensing concerns. Emerging risk area with active litigation around AI training data copyright.',
        recommendation:
          'Add "Are there IP or licensing concerns with this AI system or its training data?" (yes / no / unknown).',
      },
      {
        field: 'Vendor Contingency Plan',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NIST AI RMF GOVERN 6.2'],
        finding:
          'No field asks what happens if the vendor fails or discontinues service. Important for critical business processes.',
        recommendation:
          'Add for vendor systems: "What is the fallback if this vendor becomes unavailable?" (alternative vendor / manual process / no fallback / not applicable).',
      },
    ],
  },
  {
    id: 'monitoring',
    label: 'Performance & Monitoring',
    items: [
      {
        field: 'Performance Metrics Defined',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Colorado AI Act', 'SR 11-7', 'ISO 42001 A.8', 'NIST AI RMF'],
        finding:
          'No intake field asks whether performance metrics or success criteria are defined. Important for establishing accountability.',
        recommendation:
          'Add "Have success metrics been defined for this AI system?" (yes / in progress / no). Low-effort, high-signal question.',
      },
      {
        field: 'Monitoring Plan',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['ISO 42001 A.8', 'SR 11-7', 'Colorado AI Act', 'NAIC'],
        finding:
          'No monitoring plan captured at intake. While detailed monitoring is assessment-stage, a simple "Do you have a monitoring plan?" signal is valuable.',
        recommendation:
          'Add for production systems: "Is there an ongoing monitoring plan?" (yes / planned / no).',
      },
      {
        field: 'Incident Management Process',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['ISO 42001 A.10', 'NIST AI RMF GOVERN 4.3'],
        finding:
          'No field asks whether an incident response process exists. If the AI makes a critical error, who is called?',
        recommendation:
          'Add "Is there a defined process for handling AI incidents or errors?" (yes / no / not yet). Especially important for production systems.',
      },
    ],
  },
  {
    id: 'financial-services',
    label: 'Insurance & Financial Services',
    items: [
      {
        field: 'Insurance Lifecycle Phase',
        currentQuestion: 'Q4 — Business Area + Q14 — High-Risk Triggers',
        rating: 'adequate',
        frameworks: ['NAIC Model Bulletin'],
        finding:
          'Business area captures underwriting/claims/etc. and triggers capture insurance pricing. But NAIC expects explicit mapping to the insurance lifecycle (marketing, underwriting, rating, claims, fraud).',
        recommendation:
          'Consider adding a conditional "Insurance lifecycle phase" multiselect when business area is actuarial, claims, or underwriting.',
      },
      {
        field: 'Actuarial Justification Available',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['NAIC Model Bulletin'],
        finding:
          'For insurance pricing/rating AI, NAIC expects actuarial justification. Not captured.',
        recommendation:
          'Add for insurance pricing triggers: "Is actuarial justification available for this model\'s outputs?" (yes / in progress / no / not applicable).',
      },
      {
        field: 'Board / Senior Management Oversight',
        currentQuestion: 'Q3 — Executive Sponsor',
        rating: 'adequate',
        frameworks: ['NAIC', 'SR 11-7'],
        finding:
          'Executive sponsor captures accountability, but NAIC and SR 11-7 expect evidence of board-level awareness for material AI use.',
        recommendation:
          'For high-risk use cases, add "Has this use case been reported to the board or a board committee?" (yes / scheduled / no / not required).',
      },
    ],
  },
  {
    id: 'emerging',
    label: 'Emerging 2025-2026 Requirements',
    items: [
      {
        field: 'Shadow AI Detection',
        currentQuestion: null,
        rating: 'gap',
        frameworks: ['Emerging (ISACA 2025)', 'Internal governance'],
        finding:
          'No field captures whether this system was pre-approved or is being registered retroactively. 63% of orgs lack shadow AI governance (ISACA 2025).',
        recommendation:
          'Add "Was this AI system approved before development/deployment?" (yes, pre-approved / no, registering retroactively / this is the approval process). Powerful signal for shadow AI.',
      },
      {
        field: 'Agent Tool Access Permissions',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Singapore Agentic AI MGF', 'Microsoft Agent Governance Toolkit'],
        finding:
          "No field captures what tools, APIs, or services an AI agent can access. Critical for agent governance — your platform has an Agent Tier framework but doesn't collect the data to classify properly.",
        recommendation:
          'Add conditional (when AI type = Agent): "What tools/APIs/services can this agent access?" (internal APIs, databases, external services, file system, code execution, email/messaging).',
      },
      {
        field: 'Multi-Agent System Architecture',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Singapore Agentic AI MGF', 'Emerging'],
        finding:
          'No field captures whether this is part of a multi-agent orchestration. Cascading failure risk is a top emerging concern.',
        recommendation:
          'Add conditional: "Is this agent part of a multi-agent system?" (yes / no). If yes: "How many agents interact?" and "Is there a supervisor agent?"',
      },
      {
        field: 'Environmental / Compute Footprint',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['OECD', 'Emerging (ESG)'],
        finding:
          'No sustainability consideration. Low priority today but increasingly expected by ESG-conscious organizations.',
        recommendation:
          'Low priority. Consider adding in Phase 3: "Estimated compute intensity" (low / medium / high / unknown).',
      },
      {
        field: 'IP / Copyright Risk',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['Emerging (WIPO)', 'Litigation trends'],
        finding:
          'No field addresses copyright risk from AI-generated outputs or training data. Active litigation area.',
        recommendation:
          'Add "Could this system generate content that raises IP/copyright concerns?" (yes / no / unknown). Increasingly relevant for GenAI.',
      },
      {
        field: 'Upstream/Downstream AI Dependencies',
        currentQuestion: null,
        rating: 'missing',
        frameworks: ['NIST AI RMF MAP 4.1', 'OWASP Agentic AI Top 10'],
        finding:
          'No system dependency mapping. If an upstream AI fails, cascading effects on downstream systems are invisible.',
        recommendation:
          'Add "Does this system depend on other AI systems?" and "Do other systems depend on this system\'s outputs?" — creates an AI dependency graph.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scoring                                                            */
/* ------------------------------------------------------------------ */

function computeScores(categories: AuditCategory[]) {
  const allItems = categories.flatMap((c) => c.items);
  const total = allItems.length;
  const strong = allItems.filter((i) => i.rating === 'strong').length;
  const adequate = allItems.filter((i) => i.rating === 'adequate').length;
  const gap = allItems.filter((i) => i.rating === 'gap').length;
  const missing = allItems.filter((i) => i.rating === 'missing').length;
  const coverage = Math.round(((strong + adequate * 0.7 + gap * 0.3) / total) * 100);
  return { total, strong, adequate, gap, missing, coverage };
}

/* ------------------------------------------------------------------ */
/*  UI Components                                                      */
/* ------------------------------------------------------------------ */

const ratingConfig: Record<
  Rating,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  strong: {
    label: 'Strong',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  },
  adequate: {
    label: 'Adequate',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  gap: {
    label: 'Gap',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  missing: {
    label: 'Missing',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'M18 6L6 18M6 6l12 12',
  },
};

function RatingBadge({ rating }: { rating: Rating }) {
  const cfg = ratingConfig[rating];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={cfg.icon} />
      </svg>
      {cfg.label}
    </span>
  );
}

function CategoryScore({ category }: { category: AuditCategory }) {
  const items = category.items;
  const strong = items.filter((i) => i.rating === 'strong').length;
  const adequate = items.filter((i) => i.rating === 'adequate').length;
  const gap = items.filter((i) => i.rating === 'gap').length;
  const missing = items.filter((i) => i.rating === 'missing').length;
  const total = items.length;
  const score = Math.round(((strong + adequate * 0.7 + gap * 0.3) / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {items.map((item) => (
          <div
            key={item.field}
            className={`w-2.5 h-6 rounded-sm ${
              item.rating === 'strong'
                ? 'bg-emerald-400'
                : item.rating === 'adequate'
                  ? 'bg-blue-400'
                  : item.rating === 'gap'
                    ? 'bg-amber-400'
                    : 'bg-red-300'
            }`}
            title={`${item.field}: ${item.rating}`}
          />
        ))}
      </div>
      <span className="text-xs font-mono font-semibold text-slate-500 w-10 text-right">
        {score}%
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 tabular-nums">{score}%</span>
        <span className="text-xs text-slate-400">coverage</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function IntakeAuditPage() {
  const [expandedCategory, setExpandedCategory] = useState<Category | null>(null);
  const [filter, setFilter] = useState<Rating | 'all'>('all');
  const scores = computeScores(auditCategories);

  const filteredCategories = auditCategories
    .map((cat) => ({
      ...cat,
      items: filter === 'all' ? cat.items : cat.items.filter((i) => i.rating === filter),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <Link href="/roadmap" className="hover:text-blue-600 transition-colors">
            Roadmap
          </Link>
          <span>/</span>
          <span className="text-slate-600">Intake Audit</span>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            Intake Questions Audit Report
          </h1>
          <p className="text-sm text-slate-500">
            Evaluated against EU AI Act, NIST AI RMF, ISO 42001, OECD, Canada AIA, Colorado AI Act,
            NYC LL144, NAIC, SR 11-7, Singapore MGF, and emerging 2025-2026 requirements.
          </p>
        </div>

        {/* Executive Summary */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-5">Executive Summary</h2>
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <ScoreRing score={scores.coverage} />
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                    {scores.strong}
                  </p>
                  <p className="text-xs text-emerald-600">Strong</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold text-blue-700 tabular-nums">{scores.adequate}</p>
                  <p className="text-xs text-blue-600">Adequate</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold text-amber-700 tabular-nums">{scores.gap}</p>
                  <p className="text-xs text-amber-600">Gaps</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold text-red-700 tabular-nums">{scores.missing}</p>
                  <p className="text-xs text-red-600">Missing</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your intake captures <strong>{scores.strong + scores.adequate}</strong> of{' '}
                <strong>{scores.total}</strong> fields at strong or adequate levels.{' '}
                <strong>{scores.gap} gaps</strong> need enhancement and{' '}
                <strong>{scores.missing} fields</strong> are missing entirely. Strongest areas: risk
                classification, ownership, and data sensitivity. Biggest gaps: transparency,
                monitoring, emerging agent governance, and supply chain traceability.
              </p>
            </div>
          </div>
        </div>

        {/* Top Findings */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
            <h3 className="text-sm font-semibold text-red-800 mb-3">Critical Missing Fields</h3>
            <ul className="space-y-2">
              {auditCategories
                .flatMap((c) => c.items)
                .filter((i) => i.rating === 'missing')
                .slice(0, 6)
                .map((item) => (
                  <li key={item.field} className="flex items-start gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-red-900">{item.field}</p>
                      <p className="text-xs text-red-700">
                        {item.frameworks.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
            <h3 className="text-sm font-semibold text-emerald-800 mb-3">
              Above-Industry Strengths
            </h3>
            <ul className="space-y-2">
              {[
                {
                  title: 'Real-time EU AI Act auto-classification',
                  detail: 'Sidebar updates as user types — no competitor does this',
                },
                {
                  title: 'Model registry integration',
                  detail: 'Q10a pulls from live model registry with metadata',
                },
                {
                  title: 'Honest oversight framing',
                  detail: '"How things actually work, not on paper" — reduces governance theater',
                },
                {
                  title: 'Affected population scale',
                  detail: 'Both type AND count captured — enables risk-weighted scoring',
                },
                {
                  title: 'Insurance-specific triggers',
                  detail: '9 triggers mapped to EU AI Act Annex III and NAIC',
                },
                {
                  title: '"Why we ask" transparency',
                  detail: 'Every question explains its governance purpose — builds trust',
                },
              ].map((s) => (
                <li key={s.title} className="flex items-start gap-2">
                  <svg
                    className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-emerald-900">{s.title}</p>
                    <p className="text-xs text-emerald-700">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
          {(['all', 'strong', 'adequate', 'gap', 'missing'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'all'
                ? `All (${scores.total})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${scores[f as keyof typeof scores]})`}
            </button>
          ))}
        </div>

        {/* Category Detail */}
        <div className="space-y-3">
          {filteredCategories.map((cat) => {
            const isExpanded = expandedCategory === cat.id;
            return (
              <div
                key={cat.id}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{cat.label}</h3>
                      <span className="text-xs text-slate-400">{cat.items.length} fields</span>
                    </div>
                  </div>
                  <CategoryScore category={cat} />
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 animate-fade-in">
                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      {cat.items.map((item) => (
                        <div
                          key={item.field}
                          className={`rounded-lg border p-4 ${ratingConfig[item.rating].bg} ${ratingConfig[item.rating].border}`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-slate-900">{item.field}</h4>
                                <RatingBadge rating={item.rating} />
                              </div>
                              {item.currentQuestion && (
                                <p className="text-xs text-slate-500">
                                  Currently:{' '}
                                  <span className="font-medium text-slate-700">
                                    {item.currentQuestion}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed mb-2">
                            {item.finding}
                          </p>
                          {item.recommendation && (
                            <div className="bg-white/60 rounded-md px-3 py-2 border border-slate-200/50">
                              <p className="text-xs text-slate-700">
                                <span className="font-semibold">Recommendation:</span>{' '}
                                {item.recommendation}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {item.frameworks.map((f) => (
                              <span
                                key={f}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/50 text-xs text-slate-500 border border-slate-200/50"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Framework Coverage Matrix */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Framework Coverage Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              {
                name: 'EU AI Act',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Strong classification; missing Annex VIII registration fields',
              },
              {
                name: 'NIST AI RMF',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Good MAP coverage; GOVERN functions partially addressed',
              },
              {
                name: 'ISO 42001',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Core AI system documentation covered; monitoring gaps',
              },
              {
                name: 'Colorado AI Act',
                coverage: 'Low',
                color: 'red',
                note: 'Missing: training data, bias audit, transparency disclosure',
              },
              {
                name: 'NYC LL144',
                coverage: 'Low',
                color: 'red',
                note: 'Missing: user notification, bias audit, explainability',
              },
              {
                name: 'NAIC Bulletin',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Business areas map well; missing actuarial justification',
              },
              {
                name: 'SR 11-7',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Ownership strong; missing performance/validation fields',
              },
              {
                name: 'Canada AIA',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Impact assessment well mapped; data provenance missing',
              },
              {
                name: 'Singapore MGF',
                coverage: 'Low',
                color: 'red',
                note: 'Agent governance fields not yet captured',
              },
              {
                name: 'OECD Principles',
                coverage: 'Moderate',
                color: 'amber',
                note: 'Core principles covered; environmental impact missing',
              },
              {
                name: 'Emerging 2025-26',
                coverage: 'Low',
                color: 'red',
                note: 'Agent, supply chain, IP, shadow AI all missing',
              },
              {
                name: 'CFPB / OCC',
                coverage: 'Low',
                color: 'red',
                note: 'Missing adverse action notices, fair lending fields',
              },
            ].map((fw) => (
              <div
                key={fw.name}
                className={`rounded-lg border px-3 py-2.5 ${
                  fw.color === 'red'
                    ? 'bg-red-50 border-red-100'
                    : fw.color === 'amber'
                      ? 'bg-amber-50 border-amber-100'
                      : 'bg-emerald-50 border-emerald-100'
                }`}
              >
                <p
                  className={`text-xs font-semibold ${
                    fw.color === 'red'
                      ? 'text-red-900'
                      : fw.color === 'amber'
                        ? 'text-amber-900'
                        : 'text-emerald-900'
                  }`}
                >
                  {fw.name}
                </p>
                <p
                  className={`text-xs font-medium ${
                    fw.color === 'red'
                      ? 'text-red-700'
                      : fw.color === 'amber'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {fw.coverage}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    fw.color === 'red'
                      ? 'text-red-600'
                      : fw.color === 'amber'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {fw.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 px-6 py-4">
          <h3 className="text-xs font-semibold text-slate-500 mb-2">Methodology</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-500">
            <div>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />{' '}
                <strong className="text-slate-700">Strong</strong>
              </span>
              <p>Field fully addresses the requirement with good design</p>
            </div>
            <div>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />{' '}
                <strong className="text-slate-700">Adequate</strong>
              </span>
              <p>Partially covered or captures the signal indirectly</p>
            </div>
            <div>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />{' '}
                <strong className="text-slate-700">Gap</strong>
              </span>
              <p>Relevant data exists elsewhere but is insufficient at intake</p>
            </div>
            <div>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-300" />{' '}
                <strong className="text-slate-700">Missing</strong>
              </span>
              <p>No field captures this information anywhere in the intake</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
