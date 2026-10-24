// The API tests run against a throwaway Postgres 17 started by test/setup/global.ts.
export const TEST_DB_PORT = 54329;
export const TEST_DB_NAME = 'flp_test';
export const TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:${TEST_DB_PORT}/${TEST_DB_NAME}`;
