/**
 * Test setup file
 * Configures database and test environment
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock database module before any imports
jest.mock('../src/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  pool: {
    connect: jest.fn(),
    end: jest.fn()
  },
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn()
}));

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(30000);

// Global mock for database
global.mockDb = {
  query: jest.fn(),
  transaction: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
  all: jest.fn(),
  get: jest.fn(),
  run: jest.fn()
};