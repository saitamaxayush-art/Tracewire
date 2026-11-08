// Column definitions copied from db/banking_fraud_db.sql, used by the ER diagram.

import type { TableName } from '../types/db';

export interface ColumnDef {
  name: string;
  type: string;
  key?: 'PK' | 'FK' | 'UQ';
  nullable?: boolean;
  references?: { table: TableName; column: string; onDelete?: string };
}

export const SCHEMA: Record<TableName, ColumnDef[]> = {
  Customers: [
    { name: 'customer_id', type: 'BIGINT', key: 'PK' },
    { name: 'customer_name', type: 'VARCHAR(100)' },
    { name: 'email', type: 'VARCHAR(150)', key: 'UQ' },
    { name: 'phone_number', type: 'VARCHAR(30)' },
    { name: 'country', type: 'VARCHAR(60)' },
    { name: 'nationality', type: 'VARCHAR(60)' },
    { name: 'preferred_currency', type: 'VARCHAR(3)' },
    { name: 'customer_status', type: 'ENUM(13)' },
    { name: 'registration_date', type: 'DATE' },
  ],
  Accounts: [
    { name: 'account_id', type: 'BIGINT', key: 'PK' },
    { name: 'customer_id', type: 'BIGINT', key: 'FK', references: { table: 'Customers', column: 'customer_id', onDelete: 'CASCADE' } },
    { name: 'account_number', type: 'BIGINT', key: 'UQ' },
    { name: 'account_type', type: 'ENUM(19)' },
    { name: 'balance', type: 'DECIMAL(18,2)' },
    { name: 'currency', type: 'VARCHAR(3)' },
    { name: 'status', type: 'ENUM(13)' },
    { name: 'ifsc_code', type: 'VARCHAR(20)', nullable: true },
  ],
  Transactions: [
    { name: 'transaction_ref', type: 'VARCHAR(20)', key: 'PK' },
    { name: 'sender_account_id', type: 'BIGINT', key: 'FK', references: { table: 'Accounts', column: 'account_id' } },
    { name: 'receiver_account_id', type: 'BIGINT', key: 'FK', references: { table: 'Accounts', column: 'account_id' } },
    { name: 'transaction_type', type: 'ENUM(20)' },
    { name: 'amount', type: 'DECIMAL(18,2)' },
    { name: 'currency', type: 'VARCHAR(3)' },
    { name: 'sender_location', type: 'VARCHAR(100)', nullable: true },
    { name: 'sender_latitude', type: 'DECIMAL(10,6)', nullable: true },
    { name: 'sender_longitude', type: 'DECIMAL(10,6)', nullable: true },
    { name: 'status', type: 'ENUM(6)' },
    { name: 'created_at', type: 'DATETIME' },
  ],
  Anomaly_Patterns: [
    { name: 'anomaly_id', type: 'BIGINT AI', key: 'PK' },
    { name: 'transaction_ref', type: 'VARCHAR(20)', key: 'FK', references: { table: 'Transactions', column: 'transaction_ref', onDelete: 'CASCADE' } },
    { name: 'customer_id', type: 'BIGINT', key: 'FK', references: { table: 'Customers', column: 'customer_id', onDelete: 'CASCADE' } },
    { name: 'rule_code', type: 'VARCHAR(50)' },
    { name: 'flag_reason', type: 'VARCHAR(255)' },
    { name: 'flagged_amount', type: 'DECIMAL(18,2)' },
    { name: 'currency', type: 'VARCHAR(3)' },
    { name: 'risk_score', type: 'DECIMAL(5,2)' },
    { name: 'severity_level', type: 'ENUM(6)' },
    { name: 'action_taken', type: 'ENUM(5)' },
    { name: 'is_resolved', type: 'BOOLEAN' },
    { name: 'resolution_notes', type: 'TEXT', nullable: true },
    { name: 'reviewed_by', type: 'VARCHAR(100)' },
    { name: 'detected_at', type: 'DATETIME' },
    { name: 'resolved_at', type: 'DATETIME', nullable: true },
  ],
  Dispute_Logs: [
    { name: 'dispute_id', type: 'BIGINT AI', key: 'PK' },
    { name: 'transaction_ref', type: 'VARCHAR(20)', key: 'FK', references: { table: 'Transactions', column: 'transaction_ref', onDelete: 'CASCADE' } },
    { name: 'customer_id', type: 'BIGINT', key: 'FK', references: { table: 'Customers', column: 'customer_id', onDelete: 'CASCADE' } },
    { name: 'dispute_type', type: 'ENUM(6)' },
    { name: 'dispute_reason', type: 'VARCHAR(255)' },
    { name: 'dispute_amount', type: 'DECIMAL(18,2)' },
    { name: 'currency', type: 'VARCHAR(3)' },
    { name: 'dispute_status', type: 'ENUM(5)' },
    { name: 'filed_at', type: 'DATETIME' },
    { name: 'resolved_at', type: 'DATETIME', nullable: true },
  ],
  Audit_Trail: [
    { name: 'audit_id', type: 'BIGINT AI', key: 'PK' },
    { name: 'transaction_ref', type: 'VARCHAR(20)', key: 'FK', nullable: true, references: { table: 'Transactions', column: 'transaction_ref', onDelete: 'SET NULL' } },
    { name: 'customer_id', type: 'BIGINT', key: 'FK', nullable: true, references: { table: 'Customers', column: 'customer_id', onDelete: 'SET NULL' } },
    { name: 'action_type', type: 'VARCHAR(100)' },
    { name: 'action_description', type: 'VARCHAR(255)' },
    { name: 'performed_by', type: 'VARCHAR(100)' },
    { name: 'risk_score', type: 'DECIMAL(5,2)', nullable: true },
    { name: 'severity_level', type: 'VARCHAR(30)', nullable: true },
    { name: 'action_timestamp', type: 'DATETIME' },
  ],
};

export const TABLE_NAMES = Object.keys(SCHEMA) as TableName[];

export interface Relation {
  from: TableName;
  column: string;
  to: TableName;
  toColumn: string;
  onDelete?: string;
}

export const RELATIONS: Relation[] = TABLE_NAMES.flatMap((t) =>
  SCHEMA[t].filter((c) => c.references).map((c) => ({ from: t, column: c.name, to: c.references!.table, toColumn: c.references!.column, onDelete: c.references!.onDelete })),
);
