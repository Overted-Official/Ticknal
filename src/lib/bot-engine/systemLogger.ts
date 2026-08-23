/**
 * Structured System Logger for Intraday Bot Telemetry.
 *
 * Every engine component logs through this module.
 * All logs are persisted to `intraday_system_logs` and visible
 * in the Logs tab terminal console in real time.
 */

import { db } from '@/db';
import { intradaySystemLogs } from '@/db/schema';
import type { LogLevel, LogSource } from './types';

async function writeLog(
  level: LogLevel,
  source: LogSource,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(intradaySystemLogs).values({
      level,
      source,
      message,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // Last-resort fallback: never let logging crash the engine
    console.error(`[BOT-LOG-FAILURE] ${level} ${source}: ${message}`, err);
  }
}

export const botLog = {
  info: (source: LogSource, message: string, metadata?: Record<string, any>) =>
    writeLog('INFO', source, message, metadata),

  warn: (source: LogSource, message: string, metadata?: Record<string, any>) =>
    writeLog('WARN', source, message, metadata),

  error: (source: LogSource, message: string, metadata?: Record<string, any>) =>
    writeLog('ERROR', source, message, metadata),

  debug: (source: LogSource, message: string, metadata?: Record<string, any>) =>
    writeLog('DEBUG', source, message, metadata),
};
