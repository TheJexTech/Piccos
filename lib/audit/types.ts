export type AuditLogEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
};
