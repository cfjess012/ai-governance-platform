import { seedModels } from '@/config/seed-models';
import type { IntakeRecord } from '@/types/intake';
import type { ModelRecord } from '@/types/model';

/**
 * In-memory database client for POC.
 * Structured for easy migration to DynamoDB:
 *   - IntakeRecord: PK=INTAKE#<id>, SK=METADATA
 *   - ModelRecord:  PK=MODEL#<id>,  SK=METADATA
 */
class InMemoryDB {
  private intakeRecords: Map<string, IntakeRecord> = new Map();
  private modelRecords: Map<string, ModelRecord> = new Map();
  private modelsSeeded = false;

  // ── Intake ──

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

  // ── Models ──

  private ensureModelsSeeded(): void {
    if (this.modelsSeeded) return;
    this.modelsSeeded = true;
    const now = new Date().toISOString();
    for (const model of seedModels) {
      const id = `model-seed-${model.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      this.modelRecords.set(id, {
        id,
        data: model,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      });
    }
  }

  async saveModel(record: ModelRecord): Promise<void> {
    this.ensureModelsSeeded();
    this.modelRecords.set(record.id, { ...record, updatedAt: new Date().toISOString() });
  }

  async getModel(id: string): Promise<ModelRecord | null> {
    this.ensureModelsSeeded();
    return this.modelRecords.get(id) ?? null;
  }

  async listModels(filters?: { status?: string; provider?: string }): Promise<ModelRecord[]> {
    this.ensureModelsSeeded();
    let records = Array.from(this.modelRecords.values());
    if (filters?.status) {
      records = records.filter((r) => r.data.status === filters.status);
    }
    if (filters?.provider) {
      records = records.filter((r) => r.data.provider === filters.provider);
    }
    return records.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async deleteModel(id: string): Promise<void> {
    this.ensureModelsSeeded();
    this.modelRecords.delete(id);
  }
}

// Singleton for POC — in production, replace with DynamoDB DocumentClient
let dbInstance: InMemoryDB | null = null;

export function getDB(): InMemoryDB {
  if (!dbInstance) {
    dbInstance = new InMemoryDB();
  }
  return dbInstance;
}
