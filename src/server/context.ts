import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { IncomingMessage } from 'http';

export interface Context {
  // Add auth/user context here when authentication is implemented
  userId?: string;
  request?: IncomingMessage;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<Context> {
  return {
    // userId: fromAuthMaybe,
  };
}