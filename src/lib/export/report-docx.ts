/**
 * Word (.docx) report generator for AI Risk Assessment Reports.
 *
 * Produces a formal, audit-ready 14-section document using the `docx` library.
 * Quality bar: SSAE 18 SOC 2 Type II report — formal structure, no filler.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ReportData, SummaryRow } from './report-data';

// ─── Style constants ───────────────────────────────────────────────

const FONT_SERIF = 'Georgia';
const FONT_SANS = 'Calibri';
const COLOR_DARK = '1e293b';
const COLOR_HEADER_BG = '1e3a5f';
const COLOR_ALT_ROW = 'f8fafc';
const COLOR_RED = 'dc2626';

// ─── Helper functions ──────────────────────────────────────────────

function heading1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_SANS, size: 32, bold: true, color: COLOR_DARK })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_SANS, size: 26, bold: true, color: COLOR_DARK })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function bodyPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_SERIF, size: 21, color: COLOR_DARK })],
    spacing: { after: 120, line: 276 },
  });
}

function boldLabel(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, font: FONT_SERIF, size: 21, bold: true, color: COLOR_DARK }),
      new TextRun({ text: value, font: FONT_SERIF, size: 21, color: COLOR_DARK }),
    ],
    spacing: { after: 80 },
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT_SANS, size: 18, bold: true, color: 'ffffff' })], alignment: AlignmentType.LEFT })],
    shading: { type: ShadingType.SOLID, color: COLOR_HEADER_BG },
    borders: cellBorders(),
  });
}

function dataCell(text: string, isAlt = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, font: FONT_SERIF, size: 19, color: COLOR_DARK })], alignment: AlignmentType.LEFT })],
    shading: isAlt ? { type: ShadingType.SOLID, color: COLOR_ALT_ROW } : undefined,
    borders: cellBorders(),
  });
}

function cellBorders() {
  const style = { style: BorderStyle.SINGLE, size: 1, color: 'cbd5e1' };
  return { top: style, bottom: style, left: style, right: style };
}

function twoColTable(rows: SummaryRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('Attribute'), headerCell('Value')] }),
      ...rows.map(
        (r, i) =>
          new TableRow({
            children: [dataCell(r.label, i % 2 === 1), dataCell(r.value, i % 2 === 1)],
          }),
      ),
    ],
  });
}

// ─── Document generator ────────────────────────────────────────────

export async function generateDocx(data: ReportData): Promise<Buffer> {
  const sections = [];

  // ── Cover page ──
  sections.push({
    properties: {},
    children: [
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({
        children: [new TextRun({ text: 'AI Governance Program', font: FONT_SANS, size: 28, color: COLOR_DARK })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: 'AI Use Case Risk Assessment Report', font: FONT_SANS, size: 48, bold: true, color: COLOR_DARK })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ spacing: { before: 300 } }),
      new Paragraph({
        children: [new TextRun({ text: data.meta.caseName, font: FONT_SANS, size: 32, color: '475569' })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: 'CONFIDENTIAL — FOR INTERNAL AND REGULATORY USE ONLY', font: FONT_SANS, size: 20, bold: true, color: COLOR_RED })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ spacing: { before: 600 } }),
      new Paragraph({
        children: [new TextRun({ text: data.meta.reportDate, font: FONT_SERIF, size: 22, color: '64748b' })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Prepared by: Ethical and Responsible AI (ERAI) Team', font: FONT_SERIF, size: 22, color: '64748b' })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ spacing: { before: 200 } }),
      new Paragraph({
        children: [new TextRun({ text: `Report ID: ${data.meta.reportId}`, font: FONT_SERIF, size: 20, color: '94a3b8' })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Version: 1.0 — Initial Assessment', font: FONT_SERIF, size: 20, color: '94a3b8' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });

  // ── Body sections ──
  const bodyChildren: (Paragraph | Table)[] = [];

  // Helper to add a section
  const addSection = (num: number, title: string) => {
    bodyChildren.push(pageBreak());
    bodyChildren.push(heading1(`${num}. ${title}`));
  };

  // Section 1
  addSection(1, 'Executive Summary');
  bodyChildren.push(bodyPara(data.executiveSummaryNarrative));
  bodyChildren.push(new Paragraph({ spacing: { before: 200 } }));
  bodyChildren.push(twoColTable(data.summaryTable));

  // Section 2
  addSection(2, 'System Description');
  bodyChildren.push(heading2('2.1 System Overview'));
  bodyChildren.push(bodyPara(data.systemOverview));
  bodyChildren.push(heading2('2.2 AI Technology Type'));
  bodyChildren.push(bodyPara(data.aiTechnologyType));
  bodyChildren.push(heading2('2.3 Data Sources and Sensitivity'));
  bodyChildren.push(bodyPara(data.dataSources));
  bodyChildren.push(heading2('2.4 Deployment Scope'));
  bodyChildren.push(bodyPara(data.deploymentScope));
  bodyChildren.push(heading2('2.5 Vendor and Model Information'));
  bodyChildren.push(bodyPara(data.vendorInfo));
  bodyChildren.push(heading2('2.6 Human Oversight Model'));
  bodyChildren.push(bodyPara(data.humanOversightDescription));

  // Section 3
  addSection(3, 'Risk Classification');
  bodyChildren.push(heading2('3.1 Inherent Risk Determination'));
  bodyChildren.push(bodyPara(data.inherentRiskNarrative));
  if (data.dimensionTable.length > 0) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Dimension'), headerCell('Score'), headerCell('Max'), headerCell('Description')] }),
          ...data.dimensionTable.map((d, i) =>
            new TableRow({
              children: [dataCell(d.dimension, i % 2 === 1), dataCell(`${d.score}`, i % 2 === 1), dataCell(`${d.max}`, i % 2 === 1), dataCell(d.description, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
  }
  bodyChildren.push(heading2('3.2 Regulatory Rules Triggered'));
  if (data.regulatoryRules.length > 0) {
    for (const [i, r] of data.regulatoryRules.entries()) {
      bodyChildren.push(boldLabel(`${i + 1}. ${r.name}`, r.reason));
      bodyChildren.push(bodyPara(`Citation: ${r.citation}`));
    }
  } else {
    bodyChildren.push(bodyPara('No regulatory rules were triggered for this system.'));
  }
  bodyChildren.push(heading2('3.3 Risk Patterns Detected'));
  if (data.riskPatterns.length > 0) {
    for (const [i, p] of data.riskPatterns.entries()) {
      bodyChildren.push(boldLabel(`${i + 1}. ${p.name}`, p.description));
    }
  } else {
    bodyChildren.push(bodyPara('No risk patterns were detected for this system.'));
  }
  bodyChildren.push(heading2('3.4 Confirmed Tier and Override'));
  bodyChildren.push(bodyPara(data.confirmedTierNarrative));
  bodyChildren.push(heading2('3.5 EU AI Act Classification'));
  bodyChildren.push(bodyPara(data.euAiActNarrative));

  // Section 4
  addSection(4, 'Regulatory Scope and Framework Applicability');
  if (data.frameworkTable.length > 0) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Framework'), headerCell('Basis'), headerCell('Controls'), headerCell('Satisfied'), headerCell('%')] }),
          ...data.frameworkTable.map((f, i) =>
            new TableRow({
              children: [dataCell(f.framework, i % 2 === 1), dataCell(f.basis, i % 2 === 1), dataCell(`${f.controlsInScope}`, i % 2 === 1), dataCell(`${f.satisfied}`, i % 2 === 1), dataCell(`${f.completionPct}%`, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
    for (const gap of data.frameworkGaps) {
      bodyChildren.push(bodyPara(gap));
    }
  } else {
    bodyChildren.push(bodyPara('No regulatory frameworks were identified as applicable to this system.'));
  }

  // Section 5
  addSection(5, 'Pre-Production Risk Assessment');
  bodyChildren.push(heading2('5.1 Assessment Overview'));
  bodyChildren.push(bodyPara(data.assessmentOverview));
  bodyChildren.push(heading2('5.3 Assessor Attestation'));
  bodyChildren.push(bodyPara(data.assessorAttestationText));

  // Section 6
  addSection(6, 'Residual Risk and Mitigation Analysis');
  bodyChildren.push(heading2('6.1 Methodology'));
  bodyChildren.push(bodyPara(data.residualMethodology));
  bodyChildren.push(heading2('6.2 Mitigation Credit Summary'));
  if (data.mitigationTable.length > 0) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Mitigation'), headerCell('Credit'), headerCell('Max'), headerCell('Basis'), headerCell('Evidence')] }),
          ...data.mitigationTable.map((m, i) =>
            new TableRow({
              children: [dataCell(m.control, i % 2 === 1), dataCell(m.creditEarned, i % 2 === 1), dataCell(m.maxCredit, i % 2 === 1), dataCell(m.basis, i % 2 === 1), dataCell(m.evidenceOnFile, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
  }
  bodyChildren.push(heading2('6.3 Residual Risk Determination'));
  bodyChildren.push(bodyPara(data.residualDetermination));
  bodyChildren.push(heading2('6.4 Residual Risk Narrative'));
  bodyChildren.push(bodyPara(data.residualNarrative));

  // Section 7
  addSection(7, 'Compliance Control Status');
  bodyChildren.push(heading2('7.1 Overall Completeness'));
  bodyChildren.push(bodyPara(data.complianceOverview));
  bodyChildren.push(heading2('7.2 Control Status'));
  if (data.controlTable.length > 0) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Framework'), headerCell('Control'), headerCell('Status'), headerCell('Owner'), headerCell('Refresh')] }),
          ...data.controlTable.map((c, i) =>
            new TableRow({
              children: [dataCell(c.framework, i % 2 === 1), dataCell(c.controlName, i % 2 === 1), dataCell(c.status, i % 2 === 1), dataCell(c.owner, i % 2 === 1), dataCell(c.refreshCadence, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
  }

  // Section 8
  addSection(8, 'Evidence and Attestation Record');
  if (data.evidenceTable.length > 0) {
    for (const e of data.evidenceTable) {
      bodyChildren.push(
        twoColTable([
          { label: 'Artifact Title', value: e.title },
          { label: 'Category', value: e.category },
          { label: 'Filename', value: e.fileName },
          { label: 'File Size', value: e.fileSize },
          { label: 'Upload Date', value: e.uploadDate },
          { label: 'Uploaded By', value: e.uploadedBy },
          { label: 'Status', value: e.attestationStatus },
          { label: 'Attested By', value: e.attestedBy },
          { label: 'Attestation Date', value: e.attestationDate },
          { label: 'Expiry', value: e.expiryDate },
          { label: 'Controls', value: e.controlsSatisfied },
        ]),
      );
      bodyChildren.push(new Paragraph({ spacing: { before: 200 } }));
    }
  } else {
    bodyChildren.push(bodyPara(data.evidenceFallbackText));
  }

  // Section 9
  addSection(9, 'Exceptions and Waivers');
  if (data.exceptionTable.length > 0) {
    for (const e of data.exceptionTable) {
      bodyChildren.push(
        twoColTable([
          { label: 'Exception ID', value: e.id },
          { label: 'Policy / Control Waived', value: e.policyOrControl },
          { label: 'Reason Category', value: e.reasonCategory },
          { label: 'Justification', value: e.justification },
          { label: 'Compensating Controls', value: e.compensatingControls },
          { label: 'Approved By', value: e.approvedBy },
          { label: 'Approver Role', value: e.approverRole },
          { label: 'Approval Date', value: e.approvalDate },
          { label: 'Expiry Date', value: e.expiryDate },
          { label: 'Days Until Expiry', value: e.daysUntilExpiry },
          { label: 'Status', value: e.status },
        ]),
      );
      bodyChildren.push(new Paragraph({ spacing: { before: 200 } }));
    }
  } else {
    bodyChildren.push(bodyPara(data.exceptionFallbackText));
  }

  // Section 10
  addSection(10, 'Human Oversight Design');
  bodyChildren.push(bodyPara(data.humanOversightDesignText));

  // Section 11
  addSection(11, 'Periodic Review Schedule');
  bodyChildren.push(twoColTable(data.reviewScheduleRows));
  bodyChildren.push(new Paragraph({ spacing: { before: 200 } }));
  bodyChildren.push(bodyPara(data.reviewScheduleNarrative));

  // Section 12
  addSection(12, 'Governance Timeline and Audit Trail');
  if (data.timelineTable.length > 0) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Date'), headerCell('Time'), headerCell('Event'), headerCell('Actor'), headerCell('Details')] }),
          ...data.timelineTable.map((t, i) =>
            new TableRow({
              children: [dataCell(t.date, i % 2 === 1), dataCell(t.time, i % 2 === 1), dataCell(t.event, i % 2 === 1), dataCell(t.actor, i % 2 === 1), dataCell(t.details, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
  }
  if (data.timelineCaveat) {
    bodyChildren.push(bodyPara(data.timelineCaveat));
  }

  // Section 13 — Appendix A
  addSection(13, 'Appendix A — Intake Questionnaire Responses');
  for (const group of data.intakeGroups) {
    bodyChildren.push(heading2(group.label));
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [headerCell('Question'), headerCell('Answer')] }),
          ...group.items.map((item, i) =>
            new TableRow({
              children: [dataCell(item.question, i % 2 === 1), dataCell(item.answer, i % 2 === 1)],
            }),
          ),
        ],
      }),
    );
  }

  // Section 14 — Appendix B
  addSection(14, 'Appendix B — Regulatory Citations');
  for (const c of data.citations) {
    bodyChildren.push(boldLabel(c.controlName, ''));
    bodyChildren.push(bodyPara(`Citation: ${c.citation}`));
    bodyChildren.push(bodyPara(`Requirement: ${c.requirement}`));
    bodyChildren.push(bodyPara(`Relevance: ${c.relevance}`));
    bodyChildren.push(new Paragraph({ spacing: { before: 100 } }));
  }

  // ── Build sections ──
  sections.push({
    properties: {},
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [new TextRun({ text: `CONFIDENTIAL — AI Risk Assessment Report — ${data.meta.caseName}`, font: FONT_SANS, size: 16, color: '94a3b8' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [new TextRun({ text: `Prepared by ERAI Team | ${data.meta.reportDate}`, font: FONT_SANS, size: 14, color: '94a3b8' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    },
    children: bodyChildren,
  });

  const doc = new Document({ sections });
  return Buffer.from(await Packer.toBuffer(doc));
}
