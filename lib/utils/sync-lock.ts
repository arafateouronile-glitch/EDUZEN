import { Redis } from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * Tente d'acquérir un lock exclusif par organisation pour une opération donnée.
 * Retourne true si le lock est acquis, false si déjà en cours.
 * Sans Redis (dev), le lock est toujours accordé.
 */
export async function acquireOrgLock(
  operation: string,
  orgId: string,
  ttlSeconds = 120
): Promise<boolean> {
  if (!redis) return true
  const result = await redis.set(`lock:${operation}:${orgId}`, '1', {
    nx: true,
    ex: ttlSeconds,
  })
  return result === 'OK'
}

/**
 * Libère le lock acquis par acquireOrgLock.
 */
export async function releaseOrgLock(operation: string, orgId: string): Promise<void> {
  await redis?.del(`lock:${operation}:${orgId}`)
}
