export interface ServiceNowRecord {
  sys_id: string;
  sys_created_on: string;
  sys_updated_on: string;
  [key: string]: unknown;
}

export interface FieldMapping {
  formField: string;
  snowField: string;
  table: string;
  transform?: (value: unknown) => unknown;
}

export interface ServiceNowClient {
  createRecord(table: string, data: Record<string, unknown>): Promise<{ sys_id: string }>;
  updateRecord(table: string, sysId: string, data: Record<string, unknown>): Promise<void>;
  getRecord(table: string, sysId: string): Promise<ServiceNowRecord>;
  queryRecords(table: string, query: string): Promise<ServiceNowRecord[]>;
}
