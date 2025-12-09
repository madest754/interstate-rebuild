/**
 * Database Connection Configuration
 * 
 * Uses Neon Serverless PostgreSQL with Drizzle ORM
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Configure Neon for serverless environment
neonConfig.fetchConnectionCache = true;

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon SQL client
const sql = neon(databaseUrl);

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });

// Export for type inference
export type Database = typeof db;

/**
 * Helper function for database operations with retry logic
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 500
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a retryable error
      const isRetryable = 
        lastError.message.includes('connection') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Database operation failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
