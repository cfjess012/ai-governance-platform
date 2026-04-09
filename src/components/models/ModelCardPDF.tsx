'use client';

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { buildFallbackAnalysis, overallRiskFromFindings } from '@/lib/governance-analysis/parser';
import type { GovernanceAnalysis, RiskFinding, RiskLevel } from '@/lib/governance-analysis/types';
import {
  formatContextWindow,
  formatDownloads,
  formatParameters,
} from '@/lib/integrations/huggingface/parser';
import type { AIUseCase } from '@/types/inventory';
import type { ModelRecord } from '@/types/model';

// ─── Colors & spacing ────────────────────────────────────────────

const colors = {
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  light: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  bgSubtle: '#f8fafc',
  bgAccent: '#eff6ff',
  bgWarning: '#fffbeb',
  bgDanger: '#fef2f2',
  accent: '#1e40af',
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
  unknown: '#94a3b8',
};

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: colors.green,
  MEDIUM: colors.amber,
  HIGH: colors.red,
  UNKNOWN: colors.unknown,
};

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 9.5,
    color: colors.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
  },

  // Cover page
  coverHeader: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 22,
    marginBottom: 28,
  },
  documentLabel: {
    fontSize: 8.5,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 14,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  coverTitle: {
    fontSize: 34,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    lineHeight: 1.05,
    letterSpacing: -0.5,
  },
  coverSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 1.3,
  },
  coverMeta: {
    fontSize: 8.5,
    color: colors.light,
    fontStyle: 'italic',
    lineHeight: 1.3,
  },

  // Verdict box (cover page)
  verdictBox: {
    backgroundColor: colors.bgSubtle,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: 18,
    marginBottom: 22,
    borderRadius: 2,
  },
  verdictLabel: {
    fontSize: 8,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  verdictText: {
    fontSize: 12,
    color: colors.ink,
    lineHeight: 1.55,
    fontFamily: 'Helvetica-Bold',
  },

  // Confidence + risk grid
  metricsGrid: {
    flexDirection: 'row',
    marginBottom: 22,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginRight: 8,
    borderRadius: 4,
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  metricValue: {
    fontSize: 18,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.1,
  },
  metricSubtext: {
    fontSize: 7.5,
    color: colors.light,
    marginTop: 6,
    lineHeight: 1.3,
  },

  // Three-column lists (strengths/concerns/recommendations on cover)
  threeColRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  threeCol: {
    flex: 1,
    paddingRight: 14,
  },
  threeColLast: {
    flex: 1,
  },
  threeColHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    lineHeight: 1,
  },
  bulletItem: {
    fontSize: 8.5,
    color: colors.text,
    marginBottom: 6,
    paddingLeft: 10,
    lineHeight: 1.45,
  },

  // Section
  section: {
    marginBottom: 22,
  },
  sectionNumber: {
    fontSize: 10,
    color: colors.accent,
    fontFamily: 'Helvetica-Bold',
    marginRight: 10,
    letterSpacing: 1.5,
    lineHeight: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 13,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.2,
    lineHeight: 1,
  },

  // Subsection (within a section)
  subsection: {
    marginBottom: 14,
  },
  subsectionLabel: {
    fontSize: 7.5,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },
  subsectionText: {
    fontSize: 9.5,
    color: colors.text,
    lineHeight: 1.55,
  },

  // Risk findings
  riskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  riskLabel: {
    width: 75,
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
    paddingTop: 3,
  },
  riskBadge: {
    width: 64,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 4,
    borderRadius: 3,
    marginRight: 12,
    letterSpacing: 0.5,
  },
  riskJustification: {
    flex: 1,
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.5,
    paddingTop: 2,
  },

  // Open gaps
  gapItem: {
    flexDirection: 'row',
    backgroundColor: colors.bgWarning,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber,
    padding: 12,
    marginBottom: 8,
    borderRadius: 2,
  },
  gapTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: colors.ink,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  gapText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.5,
  },

  // Use case row
  useCaseRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  useCaseName: {
    flex: 2,
    fontSize: 9.5,
    color: colors.ink,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
  },
  useCaseMeta: {
    flex: 1,
    fontSize: 8.5,
    color: colors.muted,
    lineHeight: 1.3,
  },

  // UNKNOWN inline marker
  unknownMarker: {
    fontFamily: 'Helvetica-Bold',
    color: colors.amber,
  },

  // Footer (every page)
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: colors.light,
  },
  footerWarning: {
    fontSize: 7,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

// ─── Helper components ────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  meta: 'Meta',
  google: 'Google',
  mistral: 'Mistral AI',
  cohere: 'Cohere',
  amazon: 'Amazon',
  custom: 'Custom',
};

function ConfidenceColor(score: number): string {
  if (score >= 75) return colors.green;
  if (score >= 50) return colors.amber;
  if (score > 0) return colors.red;
  return colors.unknown;
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  const padded = String(number).padStart(2, '0');
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumber}>{padded}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Subsection({ label, value }: { label: string; value: string }) {
  const isUnknown = value === 'UNKNOWN' || value.trim().length === 0;
  return (
    <View style={styles.subsection}>
      <Text style={styles.subsectionLabel}>{label}</Text>
      <Text style={styles.subsectionText}>
        {isUnknown ? <Text style={styles.unknownMarker}>UNKNOWN — </Text> : null}
        {isUnknown ? 'Not assessed by the analysis. Treat as a governance gap.' : value}
      </Text>
    </View>
  );
}

function RiskRow({ finding }: { finding: RiskFinding }) {
  return (
    <View style={styles.riskRow}>
      <Text style={styles.riskLabel}>{finding.title}</Text>
      <View
        style={{
          ...styles.riskBadge,
          backgroundColor: RISK_COLOR[finding.level],
        }}
      >
        <Text>{finding.level}</Text>
      </View>
      <Text style={styles.riskJustification}>{finding.justification}</Text>
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────

interface ModelCardPDFProps {
  model: ModelRecord;
  /** Linked use cases (passed in by caller; not derived inside the PDF) */
  linkedUseCases?: AIUseCase[];
}

export function ModelCardPDF({ model, linkedUseCases = [] }: ModelCardPDFProps) {
  const { data, external } = model;
  const hf = external?.huggingFace;
  const meta = hf?.metadata;

  // Use the cached LLM-generated analysis, or fall back to UNKNOWN-marked stub
  const analysis: GovernanceAnalysis =
    model.governanceAnalysis ?? buildFallbackAnalysis('not-yet-generated');

  const overallRisk = overallRiskFromFindings(analysis);
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const analysisDate = analysis.generatedAt
    ? new Date(analysis.generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not yet generated';

  // Stat values
  const parameters = meta ? formatParameters(meta.parametersBillions) : 'UNKNOWN';
  const contextWindow = meta ? formatContextWindow(meta.contextWindow) : 'UNKNOWN';
  const downloads = meta ? `${formatDownloads(meta.downloads)}/30d` : '—';

  return (
    <Document
      title={`${data.name} — Governance Audit`}
      author="AI Governance Platform"
      subject={`Governance audit for ${data.name}`}
    >
      {/* ─── COVER PAGE ──────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverHeader}>
          <Text style={styles.documentLabel}>AI Model Governance Audit</Text>
          <Text style={styles.coverTitle}>{data.name}</Text>
          <Text style={styles.coverSubtitle}>
            {PROVIDER_LABELS[data.provider] ?? data.provider}
            {data.version && ` · v${data.version}`}
            {meta && ` · ${meta.modelId}`}
          </Text>
          <Text style={styles.coverMeta}>
            Generated {generatedDate} · Analysis: {analysisDate} · For risk committee review
          </Text>
        </View>

        {/* Verdict */}
        <View style={styles.verdictBox}>
          <Text style={styles.verdictLabel}>Auditor Verdict</Text>
          <Text style={styles.verdictText}>{analysis.summary}</Text>
        </View>

        {/* Metrics grid: confidence, overall risk, model basics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Confidence</Text>
            <Text
              style={{
                ...styles.metricValue,
                color: ConfidenceColor(analysis.confidenceScore),
              }}
            >
              {analysis.confidenceScore}/100
            </Text>
            <Text style={styles.metricSubtext}>
              {analysis.confidenceScore >= 75
                ? 'High confidence'
                : analysis.confidenceScore >= 50
                  ? 'Moderate confidence'
                  : analysis.confidenceScore > 0
                    ? 'Low confidence'
                    : 'Not yet generated'}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Overall Risk</Text>
            <Text style={{ ...styles.metricValue, color: RISK_COLOR[overallRisk] }}>
              {overallRisk}
            </Text>
            <Text style={styles.metricSubtext}>highest of 4 risk findings</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Parameters</Text>
            <Text style={styles.metricValue}>{parameters}</Text>
            <Text style={styles.metricSubtext}>{meta?.architecture ?? '—'}</Text>
          </View>
          <View style={{ ...styles.metricCard, ...styles.metricCardLast }}>
            <Text style={styles.metricLabel}>Context</Text>
            <Text style={styles.metricValue}>{contextWindow}</Text>
            <Text style={styles.metricSubtext}>{downloads}</Text>
          </View>
        </View>

        {/* Strengths / Concerns / Recommendations */}
        <View style={styles.threeColRow}>
          <View style={styles.threeCol}>
            <Text
              style={{
                ...styles.threeColHeader,
                color: colors.green,
                borderBottomColor: colors.green,
              }}
            >
              Strengths
            </Text>
            {analysis.strengths.length > 0 ? (
              analysis.strengths.map((s) => (
                <Text key={s} style={styles.bulletItem}>
                  • {s}
                </Text>
              ))
            ) : (
              <Text style={{ ...styles.bulletItem, color: colors.light }}>None identified</Text>
            )}
          </View>
          <View style={styles.threeCol}>
            <Text
              style={{ ...styles.threeColHeader, color: colors.red, borderBottomColor: colors.red }}
            >
              Concerns
            </Text>
            {analysis.concerns.length > 0 ? (
              analysis.concerns.map((c) => (
                <Text key={c} style={styles.bulletItem}>
                  • {c}
                </Text>
              ))
            ) : (
              <Text style={{ ...styles.bulletItem, color: colors.light }}>None identified</Text>
            )}
          </View>
          <View style={styles.threeColLast}>
            <Text
              style={{
                ...styles.threeColHeader,
                color: colors.accent,
                borderBottomColor: colors.accent,
              }}
            >
              Recommendations
            </Text>
            {analysis.recommendations.length > 0 ? (
              analysis.recommendations.map((r) => (
                <Text key={r} style={styles.bulletItem}>
                  • {r}
                </Text>
              ))
            ) : (
              <Text style={{ ...styles.bulletItem, color: colors.light }}>None provided</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.name} Governance Audit · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      {/* ─── DETAILED ANALYSIS PAGES ─────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <Section number={1} title="Intended Use">
          <Subsection label="Primary Use Cases" value={analysis.intendedUse.primaryUseCases} />
          <Subsection
            label="Explicitly Prohibited Use Cases"
            value={analysis.intendedUse.prohibitedUseCases}
          />
          <Subsection label="High-Risk Domains" value={analysis.intendedUse.highRiskDomains} />
        </Section>

        <Section number={2} title="User & Stakeholder Impact">
          <Subsection label="End Users" value={analysis.userImpact.endUsers} />
          <Subsection label="Who Could Be Harmed" value={analysis.userImpact.potentiallyHarmed} />
          <Subsection label="Realistic Harm Scenarios" value={analysis.userImpact.harmScenarios} />
        </Section>

        <Section number={3} title="Risk Assessment">
          <RiskRow finding={analysis.riskAssessment.hallucination} />
          <RiskRow finding={analysis.riskAssessment.bias} />
          <RiskRow finding={analysis.riskAssessment.security} />
          <RiskRow finding={analysis.riskAssessment.misuse} />
        </Section>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.name} Governance Audit · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section number={4} title="Performance & Evaluation">
          <Subsection label="Known Benchmarks" value={analysis.performance.knownBenchmarks} />
          <Subsection
            label="Domain-Specific Performance"
            value={analysis.performance.domainPerformance}
          />
          <Subsection label="Failure Cases" value={analysis.performance.failureCases} />
          <Subsection
            label="Confidence Calibration Issues"
            value={analysis.performance.confidenceCalibration}
          />
        </Section>

        <Section number={5} title="Training Data Overview">
          <Subsection label="Sources" value={analysis.trainingData.sources} />
          <Subsection label="Known Exclusions" value={analysis.trainingData.knownExclusions} />
          <Subsection label="Bias Sources" value={analysis.trainingData.biasSources} />
          <Subsection label="IP / Copyright Risk" value={analysis.trainingData.ipCopyrightRisk} />
        </Section>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.name} Governance Audit · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section number={6} title="Safety & Mitigations">
          <Subsection
            label="Content Moderation Approach"
            value={analysis.safety.contentModeration}
          />
          <Subsection label="Refusal Behavior" value={analysis.safety.refusalBehavior} />
          <Subsection label="Guardrails (Technical + Policy)" value={analysis.safety.guardrails} />
          <Subsection
            label="Monitoring Recommendations"
            value={analysis.safety.monitoringRecommendations}
          />
        </Section>

        <Section number={7} title="Limitations">
          <Subsection
            label="Where the Model Performs Poorly"
            value={analysis.limitations.poorPerformanceAreas}
          />
          <Subsection
            label="Situations Where Outputs Should NOT Be Trusted"
            value={analysis.limitations.untrustedScenarios}
          />
          <Subsection
            label="Overconfidence Patterns"
            value={analysis.limitations.overconfidencePatterns}
          />
        </Section>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.name} Governance Audit · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section number={8} title="Operational Guidance">
          <Subsection
            label="Required Human-in-the-Loop Scenarios"
            value={analysis.operationalGuidance.requiredHumanInLoop}
          />
          <Subsection
            label="Safe Deployment Patterns"
            value={analysis.operationalGuidance.safeDeploymentPatterns}
          />
          <Subsection
            label="Unsafe Deployment Patterns (Explicit)"
            value={analysis.operationalGuidance.unsafeDeploymentPatterns}
          />
        </Section>

        <Section number={9} title="Compliance & Governance">
          <Subsection
            label="Framework Alignment (NIST AI RMF, EU AI Act, etc.)"
            value={analysis.compliance.frameworkAlignment}
          />
          <Subsection
            label="Data Handling Considerations"
            value={analysis.compliance.dataHandling}
          />
          <Subsection label="Audit Requirements" value={analysis.compliance.auditRequirements} />
        </Section>

        <Section number={10} title="Versioning & Change Log">
          <Subsection
            label="Changes from Prior Versions"
            value={analysis.versioning.changesFromPriorVersions}
          />
          <Subsection
            label="Risk Implications of Those Changes"
            value={analysis.versioning.riskImplications}
          />
        </Section>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.name} Governance Audit · Generated {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section number={11} title="Open Gaps">
          <Text style={{ ...styles.subsectionText, marginBottom: 12 }}>
            Each item below represents an unknown the auditor could not verify. Each is a governance
            risk in its own right, regardless of the overall risk rating.
          </Text>
          {analysis.openGaps.length > 0 ? (
            analysis.openGaps.map((gap) => (
              <View key={gap.title} style={styles.gapItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gapTitle}>{gap.title}</Text>
                  <Text style={styles.gapText}>{gap.governanceRisk}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ ...styles.subsectionText, color: colors.light }}>
              No open gaps recorded by the analysis. This may itself indicate the analysis was not
              run with sufficient rigor — review with caution.
            </Text>
          )}
        </Section>

        {/* Linked use cases at the bottom of the open gaps page */}
        <Section number={12} title="Active Deployments">
          {linkedUseCases.length > 0 ? (
            <>
              <Text style={{ ...styles.subsectionText, marginBottom: 8 }}>
                The following registered use cases reference this model. Each represents an active
                governance commitment.
              </Text>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.borderStrong }}>
                {linkedUseCases.map((uc) => (
                  <View key={uc.id} style={styles.useCaseRow}>
                    <Text style={styles.useCaseName}>{uc.intake.useCaseName}</Text>
                    <Text style={styles.useCaseMeta}>{uc.intake.businessArea ?? '—'}</Text>
                    <Text style={styles.useCaseMeta}>{uc.intake.useCaseOwner ?? '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={{ ...styles.subsectionText, color: colors.light }}>
              No registered use cases reference this model.
            </Text>
          )}
        </Section>

        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>
              {data.name} Governance Audit · Generated {generatedDate}
            </Text>
            <Text style={styles.footerWarning}>
              This audit is generated by an AI analysis pipeline. Review by a qualified human risk
              officer before acting on findings.
            </Text>
          </View>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
