/**
 * Report data assembly — transforms AIUseCase into a flat, render-ready
 * ReportData object that both the DOCX and PDF generators consume.
 *
 * Every field has a defined fallback string. No undefined or null values
 * are passed to the document generators.
 */

import { buildComplianceReport, type ComplianceReport } from '@/lib/governance/evidence-completeness';
import { daysUntilExpiry } from '@/lib/governance/exceptions';
import { daysUntilReview, reviewStatus } from '@/lib/governance/review-schedule';
import type { EvidenceArtifact, GovernanceException } from '@/lib/governance/types';
import { TIER_DISPLAY, type InherentRiskTier } from '@/lib/risk/types';
import type { AIUseCase } from '@/types/inventory';

// ─── Types ─────────────────────────────────────────────────────────

export interface ReportMeta {
  reportDate: string; // "April 9, 2026"
  reportId: string;
  caseName: string;
  fileName: string; // without extension
}

export interface SummaryRow {
  label: string;
  value: string;
}

export interface DimensionRow {
  dimension: string;
  score: number;
  max: number;
  description: string;
}

export interface RuleRow {
  name: string;
  reason: string;
  citation: string;
}

export interface PatternRow {
  name: string;
  description: string;
}

export interface FrameworkRow {
  framework: string;
  basis: string;
  controlsInScope: number;
  satisfied: number;
  completionPct: number;
}

export interface MitigationRow {
  control: string;
  creditEarned: string;
  maxCredit: string;
  basis: string;
  evidenceOnFile: string;
}

export interface ControlRow {
  framework: string;
  controlId: string;
  controlName: string;
  status: string;
  owner: string;
  refreshCadence: string;
  evidenceOnFile: string;
  requirement: string;
}

export interface EvidenceRow {
  title: string;
  category: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  attestationStatus: string;
  attestedBy: string;
  attestationDate: string;
  expiryDate: string;
  controlsSatisfied: string;
}

export interface ExceptionRow {
  id: string;
  policyOrControl: string;
  reasonCategory: string;
  justification: string;
  compensatingControls: string;
  approvedBy: string;
  approverRole: string;
  approvalDate: string;
  expiryDate: string;
  daysUntilExpiry: string;
  status: string;
}

export interface TimelineRow {
  date: string;
  time: string;
  event: string;
  actor: string;
  details: string;
}

export interface IntakeQA {
  question: string;
  answer: string;
}

export interface IntakeGroup {
  label: string;
  items: IntakeQA[];
}

export interface CitationEntry {
  framework: string;
  controlName: string;
  citation: string;
  requirement: string;
  relevance: string;
}

export interface ReportData {
  meta: ReportMeta;

  // Section 1
  executiveSummaryNarrative: string;
  summaryTable: SummaryRow[];

  // Section 2
  systemOverview: string;
  aiTechnologyType: string;
  dataSources: string;
  deploymentScope: string;
  vendorInfo: string;
  humanOversightDescription: string;

  // Section 3
  inherentRiskNarrative: string;
  dimensionTable: DimensionRow[];
  regulatoryRules: RuleRow[];
  riskPatterns: PatternRow[];
  confirmedTierNarrative: string;
  euAiActNarrative: string;

  // Section 4
  frameworkTable: FrameworkRow[];
  frameworkGaps: string[];

  // Section 5
  assessmentOverview: string;
  assessorAttestationText: string;

  // Section 6
  residualMethodology: string;
  mitigationTable: MitigationRow[];
  residualDetermination: string;
  residualNarrative: string;

  // Section 7
  complianceOverview: string;
  controlTable: ControlRow[];

  // Section 8
  evidenceTable: EvidenceRow[];
  evidenceFallbackText: string;

  // Section 9
  exceptionTable: ExceptionRow[];
  exceptionFallbackText: string;

  // Section 10
  humanOversightDesignText: string;

  // Section 11
  reviewScheduleRows: SummaryRow[];
  reviewScheduleNarrative: string;

  // Section 12
  timelineTable: TimelineRow[];
  timelineCaveat: string;

  // Section 13
  intakeGroups: IntakeGroup[];

  // Section 14
  citations: CitationEntry[];
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Not available';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  };
}

function tierLabel(tier: InherentRiskTier | string | undefined): string {
  if (!tier) return 'Pending';
  return TIER_DISPLAY[tier as InherentRiskTier]?.label ?? tier;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeStr(val: unknown): string {
  if (val === undefined || val === null) return 'Not specified';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : 'None';
  return String(val);
}

const INTAKE_GROUPS_DEF = [
  { label: 'System Overview', fields: ['useCaseName', 'businessProblem', 'howAiHelps', 'businessArea', 'useCaseOwner', 'ownerEmail'] },
  { label: 'AI Model Details', fields: ['aiType', 'buildOrAcquire', 'vendorName', 'usesFoundationModel', 'whichModels', 'auditability'] },
  { label: 'Data & Privacy', fields: ['dataSensitivity', 'highRiskTriggers', 'deploymentRegions', 'otherRegions', 'thirdPartyInvolved'] },
  { label: 'Deployment & Operations', fields: ['lifecycleStage', 'previouslyReviewed', 'whoUsesSystem', 'whoAffected', 'peopleAffectedCount'] },
  { label: 'Risk & Oversight', fields: ['worstOutcome', 'humanOversight', 'differentialTreatment', 'reviewUrgency'] },
  { label: 'Testing & Validation', fields: ['previouslyReviewed', 'auditability'] },
  { label: 'Portfolio Alignment', fields: ['valueCreationLevers', 'budgetReflected', 'strategicAlignment', 'executiveSponsor'] },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', contact_required: 'Contact Required',
  triage_pending: 'Triage Pending', lightweight_review: 'Lightweight Review',
  assessment_required: 'Assessment Required', assessment_in_progress: 'Assessment In Progress',
  decision_pending: 'Decision Pending', approved: 'Approved',
  changes_requested: 'Changes Requested', rejected: 'Rejected',
  in_production: 'In Production', decommissioned: 'Decommissioned',
};

const CATEGORY_LABELS: Record<string, string> = {
  model_card: 'Model Card', dataset_sheet: 'Dataset Sheet', bias_audit: 'Bias Audit',
  robustness_test: 'Robustness Test', dpia: 'DPIA', fria: 'FRIA',
  risk_management_plan: 'Risk Management Plan', technical_documentation: 'Technical Documentation',
  human_oversight_design: 'Human Oversight Design', monitoring_plan: 'Monitoring Plan',
  incident_response_plan: 'Incident Response Plan', validation_report: 'Validation Report',
  security_assessment: 'Security Assessment', vendor_dpa: 'Vendor DPA',
  vendor_sla: 'Vendor SLA', training_records: 'Training Records',
  change_log: 'Change Log', attestation: 'Attestation', other: 'Other',
};

const REASON_LABELS: Record<string, string> = {
  business_critical: 'Business Critical', regulatory_uncertainty: 'Regulatory Uncertainty',
  technical_infeasibility: 'Technical Infeasibility', temporary_workaround: 'Temporary Workaround',
  inherited_risk: 'Inherited / Grandfathered', other: 'Other',
};

// ─── Main assembly ─────────────────────────────────────────────────

export function assembleReportData(uc: AIUseCase): ReportData {
  const today = new Date();
  const reportDate = formatDate(today.toISOString());
  const safeName = uc.intake.useCaseName?.replace(/[^a-zA-Z0-9]+/g, '_') ?? 'Unknown';
  const dateStr = today.toISOString().slice(0, 10);

  const evidence = uc.evidence ?? [];
  const exceptions = uc.exceptions ?? [];
  const activeExceptions = exceptions.filter((e) => e.status === 'active');

  // Build compliance report
  const complianceReport: ComplianceReport | null = uc.inherentRisk
    ? buildComplianceReport(
        uc.inherentRisk.applicableFrameworks.map((f) => f.framework),
        uc.classification.euAiActTier,
        evidence,
      )
    : null;

  const completenessPct = complianceReport?.summary.completenessPct ?? 0;
  const totalControls = complianceReport?.summary.total ?? 0;
  const satisfiedControls = complianceReport?.summary.satisfied ?? 0;

  const inherentTier = uc.inherentRisk?.tier;
  const residualTier = uc.residualRisk?.residualTier;
  const confirmedTier = uc.triage?.confirmedInherentTier ?? inherentTier;

  // ── Section 1: Executive Summary ──

  const casePurpose = uc.intake.businessProblem ?? uc.intake.howAiHelps ?? 'purpose not specified in intake';
  const primaryConcern = uc.inherentRisk?.topContributors?.[0]?.label ?? 'risk factors under evaluation';

  const executiveSummaryNarrative = [
    `${uc.intake.useCaseName} is an AI system designed to ${casePurpose.charAt(0).toLowerCase()}${casePurpose.slice(1).replace(/\.$/, '')}.`,
    `The system has been classified at a ${tierLabel(confirmedTier)} inherent risk tier based on a 7-dimension scoring methodology encompassing decision domain, decision authority, affected population, data sensitivity, AI capability, regulatory exposure, and reversibility.`,
    residualTier
      ? `After applying mitigation credit from collected evidence and documented controls, the residual risk tier is ${tierLabel(residualTier)}.`
      : 'Residual risk has not yet been computed as evidence collection has not begun.',
    `As of the report date, ${satisfiedControls} of ${totalControls} mandatory compliance controls have been satisfied, representing ${completenessPct}% completeness.`,
    `The current governance status is ${STATUS_LABELS[uc.status] ?? uc.status}.`,
    `The primary risk concern identified for this system is ${primaryConcern}.`,
  ].join(' ');

  const summaryTable: SummaryRow[] = [
    { label: 'Use Case Name', value: uc.intake.useCaseName ?? 'Not specified' },
    { label: 'Business Area', value: safeStr(uc.intake.businessArea) },
    { label: 'Submitter', value: uc.submittedBy },
    { label: 'Submission Date', value: formatDate(uc.createdAt) },
    { label: 'Confirmed Risk Tier', value: tierLabel(confirmedTier) },
    { label: 'Residual Risk Tier', value: tierLabel(residualTier) },
    { label: 'EU AI Act Classification', value: uc.classification.euAiActTier === 'pending' ? 'Pending' : uc.classification.euAiActTier },
    { label: 'Governance Path', value: uc.triage ? { lightweight: 'Lightweight Review', standard: 'Standard Assessment', full: 'Full Assessment + Committee Review' }[uc.triage.governancePath] : 'Pending triage' },
    { label: 'Assessment Status', value: uc.assessment ? 'Completed' : 'Not completed' },
    { label: 'Compliance Completeness', value: `${completenessPct}% (${satisfiedControls}/${totalControls} controls)` },
    { label: 'Next Review Date', value: uc.reviewSchedule ? formatDate(uc.reviewSchedule.nextReviewDue) : 'Not scheduled' },
    { label: 'Assigned Reviewer', value: uc.triage?.assignedReviewer ?? 'Not assigned' },
  ];

  // ── Section 2: System Description ──

  const aiTypes = Array.isArray(uc.intake.aiType) ? uc.intake.aiType : [];
  const aiTypeDescriptions: Record<string, string> = {
    generative_ai: 'Generative AI, a category of AI that creates novel content, text, or outputs based on learned patterns.',
    predictive_classification: 'Predictive / Classification ML, a category of AI that analyzes historical patterns to assign probability scores to new inputs without generating novel content.',
    rag: 'Retrieval-Augmented Generation (RAG), which combines information retrieval from a knowledge base with generative AI to produce grounded, context-specific outputs.',
    ai_agent: 'AI Agent, an autonomous system that can take actions, make decisions, and interact with external systems with limited human supervision.',
    rpa: 'Robotic Process Automation (RPA), which automates repetitive rule-based tasks without machine learning.',
  };

  const aiTechType = aiTypes.length > 0
    ? `The system uses ${aiTypes.map((t) => aiTypeDescriptions[t] ?? t.replace(/_/g, ' ')).join('; ')}.`
    : 'AI technology type was not specified during intake.';

  const dataSensitivity = Array.isArray(uc.intake.dataSensitivity) ? uc.intake.dataSensitivity : [];
  const hasPII = dataSensitivity.some((d) => ['personal_info', 'health_info', 'customer_confidential', 'regulated_financial'].includes(d));
  const dataSources = `Data sensitivity classification: ${dataSensitivity.length > 0 ? dataSensitivity.map((d) => d.replace(/_/g, ' ')).join(', ') : 'Not specified'}. ${hasPII ? 'The system processes personally identifiable information (PII) or sensitive personal data.' : 'No PII or sensitive personal data processing was indicated.'}`;

  const regions = Array.isArray(uc.intake.deploymentRegions) ? uc.intake.deploymentRegions : [];
  const deploymentScope = `Geographic deployment: ${regions.length > 0 ? regions.map((r) => r.replace(/_/g, ' ')).join(', ') : 'Not specified'}. Affected population: ${safeStr(uc.intake.peopleAffectedCount).replace(/_/g, ' ')}. Users: ${safeStr(uc.intake.whoAffected).replace(/_/g, ' ')}.`;

  const isVendor = uc.intake.thirdPartyInvolved === 'yes';
  const vendorInfo = isVendor
    ? `Vendor-provided system from ${uc.intake.vendorName ?? 'unnamed vendor'}. Foundation model: ${safeStr(uc.intake.usesFoundationModel).replace(/_/g, ' ')}.`
    : 'Internally developed and hosted.';

  // Human oversight
  let humanOversightDescription: string;
  const hod = uc.humanOversightDesign;
  if (hod) {
    humanOversightDescription = `Oversight model: ${hod.oversightModel.replace(/_/g, ' ')}. Review timeframe SLA: ${hod.reviewTimeframeSLA}. Escalation triggers: ${hod.escalationTriggers}. Override authority: ${hod.overrideAuthority}. Queue monitoring: ${hod.queueMonitoringProcess}. Failsafe if SLA exceeded: ${hod.failsafeIfQueueExceeded}.`;
  } else {
    humanOversightDescription = `Human oversight model selected at intake: ${safeStr(uc.intake.humanOversight).replace(/_/g, ' ')}. Structured human oversight documentation per EU AI Act Article 14 and SR 11-7 has not been completed and is required prior to production approval.`;
  }

  // ── Section 3: Risk Classification ──

  const dims = uc.inherentRisk?.dimensions ?? [];
  const dimensionTable: DimensionRow[] = dims.map((d) => ({
    dimension: d.label,
    score: d.score,
    max: 4,
    description: d.rationale,
  }));

  const regulatoryRules: RuleRow[] = (uc.inherentRisk?.firedRules ?? []).map((r) => ({
    name: r.name,
    reason: r.reason,
    citation: `${r.citation.framework} — ${r.citation.reference}`,
  }));

  const riskPatterns: PatternRow[] = (uc.inherentRisk?.firedPatterns ?? []).map((p) => ({
    name: p.name,
    description: p.description,
  }));

  const triage = uc.triage;
  const confirmedTierNarrative = triage
    ? `The auto-calculated inherent risk tier of ${tierLabel(uc.inherentRisk?.tier)} was ${triage.riskTierOverridden ? `overridden to ${tierLabel(triage.confirmedInherentTier)} by ${triage.triagedBy} on ${formatDate(triage.triagedAt)}. Override reason: ${triage.overrideReason ?? 'Not provided'}.` : `confirmed at ${tierLabel(triage.confirmedInherentTier)} by ${triage.triagedBy} on ${formatDate(triage.triagedAt)}.`} Triage note: ${triage.triageNotes}`
    : 'Triage has not been completed. The inherent risk tier is auto-calculated and has not been confirmed by a governance analyst.';

  const euTier = uc.classification.euAiActTier;
  const euDetail = uc.euAiActDetail;
  let euAiActNarrative: string;
  if (euTier === 'high') {
    euAiActNarrative = `This system has been classified as High Risk (Annex III) under the EU AI Act. This classification imposes mandatory obligations under EU AI Act Articles 9–15 and 27, including risk management systems, data governance, technical documentation, human oversight, and accuracy and robustness requirements.${euDetail?.triggers.length ? ` Triggers: ${euDetail.triggers.map((t) => `${t.annexRef}: ${t.reason}`).join('; ')}.` : ''}`;
  } else if (euTier === 'pending') {
    euAiActNarrative = 'EU AI Act classification has not yet been determined. Classification will be finalized during triage or pre-production assessment.';
  } else {
    euAiActNarrative = `This system has been classified as ${euTier} risk under the EU AI Act.${euDetail?.triggers.length ? ` Triggers: ${euDetail.triggers.map((t) => `${t.annexRef}: ${t.reason}`).join('; ')}.` : ' No high-risk triggers detected.'}`;
  }

  // ── Section 4: Regulatory Scope ──

  const frameworkMap = new Map<string, { basis: string; controls: number; satisfied: number }>();
  if (complianceReport) {
    for (const cc of complianceReport.controls) {
      const fw = cc.control.framework;
      const entry = frameworkMap.get(fw) ?? { basis: '', controls: 0, satisfied: 0 };
      entry.controls++;
      if (cc.status === 'satisfied') entry.satisfied++;
      frameworkMap.set(fw, entry);
    }
  }
  for (const af of uc.inherentRisk?.applicableFrameworks ?? []) {
    const entry = frameworkMap.get(af.framework);
    if (entry) entry.basis = af.applicabilityReason;
  }

  const frameworkTable: FrameworkRow[] = Array.from(frameworkMap.entries()).map(([fw, data]) => ({
    framework: fw,
    basis: data.basis || 'Detected by framework applicability analysis',
    controlsInScope: data.controls,
    satisfied: data.satisfied,
    completionPct: data.controls > 0 ? Math.round((data.satisfied / data.controls) * 100) : 0,
  }));

  const frameworkGaps = frameworkTable
    .filter((f) => f.completionPct < 100)
    .map((f) => `${f.framework}: ${f.controlsInScope - f.satisfied} of ${f.controlsInScope} controls unsatisfied (${f.completionPct}% complete).`);

  // ── Section 5: Assessment ──

  const assessmentOverview = uc.assessment
    ? `Pre-production assessment completed. Status: ${STATUS_LABELS[uc.status]}.`
    : 'No assessment completed as of report date. Pre-production risk assessment is required before governance decision.';

  const att = uc.assessorAttestation;
  const assessorAttestationText = att
    ? `This assessment was completed and attested by ${att.name}, ${att.title}, on ${formatDate(att.submittedAt)}. The assessor declared: "${att.declaration}"`
    : 'Assessor attestation has not been completed. Attestation by a named, qualified individual is required prior to production approval per SR 11-7 model risk management requirements.';

  // ── Section 6: Residual Risk ──

  const residualMethodology = 'The residual risk calculation starts with the confirmed inherent risk tier and applies mitigation credit earned from collected evidence and documented controls. Each of seven mitigation controls can earn between 0 and 1.0 credit based on evidence quality: text-only attestation earns partial credit, collected artifacts earn more, and attested artifacts earn full credit. The total credit is converted to tier reductions, capped at 2 tiers maximum. A regulatory floor prevents mitigation below a minimum tier when regulatory-origin rules fired during inherent risk assessment.';

  const mitigationTable: MitigationRow[] = (uc.residualRisk?.mitigationCredits ?? []).map((m) => ({
    control: m.label,
    creditEarned: m.credit.toFixed(1),
    maxCredit: '1.0',
    basis: m.evidenceBasis,
    evidenceOnFile: evidence.filter((e) => e.status === 'attested' && e.category === mapMitigationToCategory(m.id)).map((e) => e.title).join('; ') || 'None',
  }));

  const rr = uc.residualRisk;
  const residualDetermination = rr
    ? `Inherent tier: ${tierLabel(rr.inherentTier)}. Total mitigation credit: ${rr.controlCreditApplied.toFixed(2)} of ${rr.controlCreditMax.toFixed(2)} maximum tier reductions. Regulatory floor: ${tierLabel(rr.residualFloor)}. Resulting residual tier: ${tierLabel(rr.residualTier)}.`
    : 'Residual risk has not been computed. Evidence collection and assessment completion are required.';

  const residualNarrative = rr?.explanation ?? 'Residual risk narrative is not available until evidence collection begins.';

  // ── Section 7: Compliance Controls ──

  const complianceOverview = `As of ${reportDate}, ${satisfiedControls} of ${totalControls} mandatory compliance controls have been satisfied, representing ${completenessPct}% completeness. ${complianceReport?.summary.partial ?? 0} controls have partial evidence. ${complianceReport?.summary.missing ?? 0} controls are missing required evidence.`;

  const controlTable: ControlRow[] = (complianceReport?.controls ?? []).map((cc) => ({
    framework: cc.control.framework,
    controlId: cc.control.id,
    controlName: cc.control.title,
    status: cc.status.charAt(0).toUpperCase() + cc.status.slice(1),
    owner: cc.control.responsibleRole.replace(/_/g, ' '),
    refreshCadence: cc.control.refreshFrequency.replace(/_/g, ' '),
    evidenceOnFile: cc.latestEvidence?.title ?? 'None',
    requirement: cc.control.requirement,
  }));

  // ── Section 8: Evidence ──

  const evidenceTable: EvidenceRow[] = evidence.map((e) => ({
    title: e.title,
    category: CATEGORY_LABELS[e.category] ?? e.category,
    fileName: e.fileName,
    fileSize: formatBytes(e.fileSize),
    uploadDate: formatDate(e.uploadedAt),
    uploadedBy: e.uploadedBy,
    attestationStatus: e.status.charAt(0).toUpperCase() + e.status.slice(1),
    attestedBy: e.attestation ? `${e.attestation.attestedBy}, ${e.attestation.attestedRole}` : 'N/A',
    attestationDate: e.attestation ? formatDate(e.attestation.attestedAt) : 'N/A',
    expiryDate: e.expiresAt ? formatDate(e.expiresAt) : 'None specified',
    controlsSatisfied: e.controlIds.length > 0 ? e.controlIds.join(', ') : 'Not tagged to specific controls',
  }));

  const evidenceFallbackText = evidence.length === 0
    ? `No evidence artifacts have been uploaded for this use case. Evidence collection is required to satisfy ${totalControls} mandatory compliance controls.`
    : '';

  // ── Section 9: Exceptions ──

  const exceptionTable: ExceptionRow[] = activeExceptions.map((e) => ({
    id: e.id,
    policyOrControl: e.policyOrControl,
    reasonCategory: REASON_LABELS[e.reason] ?? e.reason,
    justification: e.justification,
    compensatingControls: e.compensatingControls,
    approvedBy: e.approvedBy ?? 'Not specified',
    approverRole: e.approvedByRole ?? 'Not specified',
    approvalDate: formatDate(e.approvedAt),
    expiryDate: e.expiresAt ? formatDate(e.expiresAt) : 'No expiry set',
    daysUntilExpiry: e.expiresAt ? `${daysUntilExpiry(e)} days` : 'N/A',
    status: e.status.charAt(0).toUpperCase() + e.status.slice(1),
  }));

  const exceptionFallbackText = activeExceptions.length === 0
    ? 'No governance exceptions or waivers are on file for this use case as of the report date.'
    : '';

  // ── Section 10: Human Oversight Design ──

  const humanOversightDesignText = hod
    ? `Oversight Model: ${hod.oversightModel.replace(/_/g, ' ')}. Review Timeframe SLA: ${hod.reviewTimeframeSLA}. Escalation Triggers: ${hod.escalationTriggers}. Override Authority: ${hod.overrideAuthority}. Queue Monitoring: ${hod.queueMonitoringProcess}. Failsafe: ${hod.failsafeIfQueueExceeded}.`
    : 'Human oversight has been described in narrative form only. Structured documentation per EU AI Act Article 14 and SR 11-7 requirements has not been completed.';

  // ── Section 11: Review Schedule ──

  const rs = uc.reviewSchedule;
  const reviewScheduleRows: SummaryRow[] = rs
    ? [
        { label: 'Review Cadence', value: rs.frequency.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) },
        { label: 'Basis for Cadence', value: `Confirmed ${tierLabel(confirmedTier)} risk tier` },
        { label: 'Last Reviewed', value: rs.lastReviewedAt ? formatDate(rs.lastReviewedAt) : 'Not yet reviewed' },
        { label: 'Next Review Due', value: formatDate(rs.nextReviewDue) },
        { label: 'Review Owner', value: rs.reviewOwner ?? 'Not assigned' },
        { label: 'Days Until Next Review', value: `${daysUntilReview(rs)} days` },
        { label: 'Status', value: reviewStatus(rs).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) },
      ]
    : [{ label: 'Status', value: 'Review schedule not yet established' }];

  const reviewScheduleNarrative = rs
    ? `This system requires ${rs.frequency.replace(/_/g, '-')} review based on its confirmed ${tierLabel(confirmedTier)} risk tier. ${rs.reviewOwner ? `The designated review owner is ${rs.reviewOwner}.` : 'A review owner has not been assigned.'}`
    : 'No periodic review schedule has been established for this use case.';

  // ── Section 12: Timeline ──

  const timelineTable: TimelineRow[] = uc.timeline.map((t) => {
    const dt = formatDateTime(t.timestamp);
    return {
      date: dt.date,
      time: dt.time,
      event: t.auditEvent ?? STATUS_LABELS[t.status] ?? t.status.replace(/_/g, ' '),
      actor: t.changedBy,
      details: t.auditEvent ? 'Governance audit event' : `Status transition to ${t.status.replace(/_/g, ' ')}`,
    };
  });

  const hasGenericActors = uc.timeline.some((t) =>
    t.changedBy.includes('mock-user') || t.changedBy.includes('example.com'),
  );
  const timelineCaveat = hasGenericActors
    ? 'Note: Some lifecycle events record generic platform account identities rather than named individuals. Named individual attribution is required for regulatory audit trail completeness.'
    : '';

  // ── Section 13: Intake Q&A ──

  const intakeData = uc.intake as Record<string, unknown>;
  const intakeGroups: IntakeGroup[] = INTAKE_GROUPS_DEF.map((group) => ({
    label: group.label,
    items: group.fields
      .filter((f) => intakeData[f] !== undefined && intakeData[f] !== null)
      .map((f) => ({ question: f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), answer: safeStr(intakeData[f]) })),
  })).filter((g) => g.items.length > 0);

  // ── Section 14: Citations ──

  const citations: CitationEntry[] = (complianceReport?.controls ?? []).map((cc) => ({
    framework: cc.control.framework,
    controlName: `${cc.control.citation} — ${cc.control.title}`,
    citation: cc.control.citationUrl ?? cc.control.citation,
    requirement: cc.control.requirement,
    relevance: `Applicable because: ${uc.inherentRisk?.applicableFrameworks.find((f) => f.framework === cc.control.framework)?.applicabilityReason ?? 'framework detected during risk assessment'}`,
  }));

  return {
    meta: {
      reportDate,
      reportId: uc.id,
      caseName: uc.intake.useCaseName ?? 'Unnamed',
      fileName: `AI_Risk_Assessment_${safeName}_${dateStr}`,
    },
    executiveSummaryNarrative,
    summaryTable,
    systemOverview: uc.intake.businessProblem ?? uc.intake.howAiHelps ?? 'System purpose not specified in intake.',
    aiTechnologyType: aiTechType,
    dataSources,
    deploymentScope,
    vendorInfo,
    humanOversightDescription,
    inherentRiskNarrative: uc.inherentRisk
      ? `The system has been classified at a ${tierLabel(inherentTier)} inherent risk tier. This classification was determined using a 7-dimension scoring methodology where each dimension is scored on a 0–4 scale and weighted according to its relevance to governance risk. The weighted composite score is ${uc.inherentRisk.baseScore.toFixed(0)}/100.`
      : 'Inherent risk assessment has not been completed.',
    dimensionTable,
    regulatoryRules,
    riskPatterns,
    confirmedTierNarrative,
    euAiActNarrative,
    frameworkTable,
    frameworkGaps,
    assessmentOverview,
    assessorAttestationText,
    residualMethodology,
    mitigationTable,
    residualDetermination,
    residualNarrative,
    complianceOverview,
    controlTable,
    evidenceTable,
    evidenceFallbackText,
    exceptionTable,
    exceptionFallbackText,
    humanOversightDesignText,
    reviewScheduleRows,
    reviewScheduleNarrative,
    timelineTable,
    timelineCaveat,
    intakeGroups,
    citations,
  };
}

// Map mitigation evaluator IDs to evidence categories for the "Evidence on File" column
function mapMitigationToCategory(mitigationId: string): string {
  const map: Record<string, string> = {
    human_oversight: 'human_oversight_design',
    bias_audit: 'bias_audit',
    robustness_testing: 'robustness_test',
    monitoring: 'monitoring_plan',
    incident_response: 'incident_response_plan',
    risk_management: 'risk_management_plan',
    model_validation: 'validation_report',
  };
  return map[mitigationId] ?? '';
}
