// Helper functions for rate limiting
export async function getRemainingAttempts(
  kv: KVNamespace,
  ip: string
): Promise<number> {
  const key = `rate_limit:${ip}:${getCurrentDate()}`;
  const attempts = await kv.get(key);
  return attempts ? 3 - parseInt(attempts) : 3;
}

export async function decrementAttempts(
  kv: KVNamespace,
  ip: string
): Promise<void> {
  const key = `rate_limit:${ip}:${getCurrentDate()}`;
  const attempts = await kv.get(key);
  const currentAttempts = attempts ? parseInt(attempts) : 0;

  // Set with expiration (24 hours)
  await kv.put(key, (currentAttempts + 1).toString(), {
    expirationTtl: 86400, // 24 hours in seconds
  });
}

export function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}
