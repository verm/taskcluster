module.exports = {
  READ: 'read',
  WRITE: 'write',

  // see https://www.postgresql.org/docs/11/errcodes-appendix.html
  DUPLICATE_OBJECT: '42710',
  DUPLICATE_TABLE: '42P07',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  QUERY_CANCELED: '57014',
  READ_ONLY_SQL_TRANSACTION: '25006',
  UNDEFINED_COLUMN: '42703',
  UNDEFINED_TABLE: '42P01',
  UNIQUE_VIOLATION: '23505',
};
