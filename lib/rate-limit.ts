/**
 * In-memory rate limiter using a sliding-window approach.
 * Each key (e.g. "login:<ip>") tracks timestamps of recent attempts.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(maxWindowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    store.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter((t) => now - t < maxWindowMs);
      if (entry.timestamps.length === 0) keysToDelete.push(key);
    });
    keysToDelete.forEach((key) => store.delete(key));
  }, CLEANUP_INTERVAL);
  // Allow the process to exit even if the timer is still active
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },          // 5 per 15 min
  signup: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },        // 10 per 15 min
  'signup-otp': { maxAttempts: 5, windowMs: 5 * 60 * 1000 },    // 5 resends per 5 min
  'forgot-pw': { maxAttempts: 5, windowMs: 15 * 60 * 1000 },    // 5 per 15 min
  'setup-org': { maxAttempts: 5, windowMs: 15 * 60 * 1000 },    // 5 per 15 min
  'change-pw': { maxAttempts: 5, windowMs: 15 * 60 * 1000 },    // 5 per 15 min
  'portal-login': { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  'send-email': { maxAttempts: 10, windowMs: 5 * 60 * 1000 },   // 10 per 5 min
  'generate-pdf': { maxAttempts: 10, windowMs: 5 * 60 * 1000 }, // 10 per 5 min
  provision: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },     // 5 per 15 min
  // Every call here costs real money at OpenAI, so this is a spend cap as much
  // as an abuse control. Keyed by team member id.
  'parse-notes': { maxAttempts: 10, windowMs: 10 * 60 * 1000 }, // 10 per 10 min
};

/** Limits for a bucket prefix, so a caller enforcing the same limit through a
 *  different backend cannot drift from this table. */
export function getRateLimitConfig(prefix: string): RateLimitConfig | undefined {
  return RATE_LIMIT_CONFIGS[prefix];
}

export function checkRateLimit(
  identifier: string
): RateLimitResult {
  // identifier format: "login:<ip>" or "signup:<ip>"
  const prefix = identifier.split(':')[0];
  const config = RATE_LIMIT_CONFIGS[prefix];
  if (!config) {
    return { success: true, remaining: Infinity, resetMs: 0 };
  }

  ensureCleanup(config.windowMs);

  const now = Date.now();
  const entry = store.get(identifier) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    return { success: false, remaining: 0, resetMs };
  }

  // Record this attempt
  entry.timestamps.push(now);
  store.set(identifier, entry);

  return {
    success: true,
    remaining: config.maxAttempts - entry.timestamps.length,
    resetMs: 0,
  };
}

export function formatResetTime(resetMs: number): string {
  const minutes = Math.ceil(resetMs / 60000);
  if (minutes <= 1) return '1 minute';
  return `${minutes} minutes`;
}