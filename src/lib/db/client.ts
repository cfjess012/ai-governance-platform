import type { IntakeRecord } from '@/types/intake';

/**
 * In-memory database client for POC.
 * Replaces DynamoDB for local development.
 */
class InMemoryDB {
  private intakeRecords: Map<string, IntakeRecord> = new Map();

  async saveIntake(record: IntakeRecord): Promise<void> {
    this.intakeRecords.set(record.id, { ...record, updatedAt: new Date().toISOString() });
  }

  async getIntake(id: string): Promise<IntakeRecord | null> {
    return this.intakeRecords.get(id) ?? null;
  }

  async listIntakes(filters?: { status?: string; submittedBy?: string }): Promise<IntakeRecord[]> {
    let records = Array.from(this.intakeRecords.values());

    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.submittedBy) {
      records = records.filter((r) => r.submittedBy === filters.submittedBy);
    }

    return records.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async deleteIntake(id: string): Promise<void> {
    this.intakeRecords.delete(id);
  }
}

// Singleton for POC
let dbInstance: InMemoryDB | null = null;

export function getDB(): InMemoryDB {
  if (!dbInstance) {
    dbInstance = new InMemoryDB();
  }
  return dbInstance;
}
