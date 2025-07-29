// src/common/constants/postgres-error-codes.enum.ts
export enum PostgresErrorCode {
  UniqueViolation = '23505',
  ForeignKeyViolation = '23503',
  NotNullViolation = '23502',
  CheckViolation = '23514',
  InvalidTextRepresentation = '22P02',
  SerializationFailure = '40001',
}
