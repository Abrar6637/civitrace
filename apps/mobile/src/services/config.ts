// Mock API until the backend exists. Set EXPO_PUBLIC_USE_MOCK_API=false to use the real API.
export const USE_MOCK_API = process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

// Errors carry a code; screens turn the code into an Urdu or English message
export class ServiceError extends Error {
  code: string;
  constructor(code: string, message = code) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

export const errorKey = (err: unknown) =>
  err instanceof ServiceError ? `errors.${err.code}` : 'errors.UNKNOWN';