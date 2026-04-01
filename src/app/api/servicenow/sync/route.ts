import { type NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db/client';
import { getServiceNowClient } from '@/lib/servicenow/client';
import { intakeFieldMappings, mapToServiceNow } from '@/lib/servicenow/field-mapping';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intakeId } = body;

    if (!intakeId) {
      return NextResponse.json({ error: 'intakeId is required' }, { status: 400 });
    }

    const db = getDB();
    const record = await db.getIntake(intakeId);

    if (!record) {
      return NextResponse.json({ error: 'Intake record not found' }, { status: 404 });
    }

    const snowClient = getServiceNowClient();
    const snowData = mapToServiceNow(
      record.formData as Record<string, unknown>,
      intakeFieldMappings,
    );

    // Add classification data
    snowData.u_risk_score = String(record.riskScore ?? '');
    snowData.u_eu_ai_act_tier = record.euAiActTier ?? '';
    snowData.u_agent_tier = record.agentTier ?? '';
    snowData.u_status = record.status;

    let sysId: string;
    if (record.serviceNowSysId) {
      await snowClient.updateRecord('u_ai_use_case', record.serviceNowSysId, snowData);
      sysId = record.serviceNowSysId;
    } else {
      const result = await snowClient.createRecord('u_ai_use_case', snowData);
      sysId = result.sys_id;
      await db.saveIntake({ ...record, serviceNowSysId: sysId });
    }

    return NextResponse.json({ data: { sys_id: sysId } });
  } catch {
    return NextResponse.json({ error: 'ServiceNow sync failed' }, { status: 500 });
  }
}
