import type { ServiceNowClient, ServiceNowRecord } from '@/types/servicenow';

/**
 * Mock ServiceNow client for POC.
 * Uses an in-memory store that mimics ServiceNow Table API responses.
 */
class MockServiceNowClient implements ServiceNowClient {
  private store: Map<string, Map<string, ServiceNowRecord>> = new Map();

  private getTable(table: string): Map<string, ServiceNowRecord> {
    if (!this.store.has(table)) {
      this.store.set(table, new Map());
    }
    return this.store.get(table)!;
  }

  async createRecord(table: string, data: Record<string, unknown>): Promise<{ sys_id: string }> {
    const sysId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const record: ServiceNowRecord = {
      ...data,
      sys_id: sysId,
      sys_created_on: now,
      sys_updated_on: now,
    };
    this.getTable(table).set(sysId, record);
    return { sys_id: sysId };
  }

  async updateRecord(table: string, sysId: string, data: Record<string, unknown>): Promise<void> {
    const tableStore = this.getTable(table);
    const existing = tableStore.get(sysId);
    if (!existing) {
      throw new Error(`Record ${sysId} not found in table ${table}`);
    }
    tableStore.set(sysId, {
      ...existing,
      ...data,
      sys_id: sysId,
      sys_updated_on: new Date().toISOString(),
    });
  }

  async getRecord(table: string, sysId: string): Promise<ServiceNowRecord> {
    const record = this.getTable(table).get(sysId);
    if (!record) {
      throw new Error(`Record ${sysId} not found in table ${table}`);
    }
    return record;
  }

  async queryRecords(table: string, _query: string): Promise<ServiceNowRecord[]> {
    // Simple mock: return all records in the table
    return Array.from(this.getTable(table).values());
  }
}

// Singleton mock client for POC
let clientInstance: ServiceNowClient | null = null;

export function getServiceNowClient(): ServiceNowClient {
  if (!clientInstance) {
    clientInstance = new MockServiceNowClient();
  }
  return clientInstance;
}
