import crypto from 'crypto'

const API_KEY_PREFIX = 'llm_sk_'

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate 32 random bytes and convert to hex
  const randomBytes = crypto.randomBytes(32)
  const key = API_KEY_PREFIX + randomBytes.toString('hex')

  // Hash the full key for storage
  const hash = hashApiKey(key)

  // Create prefix for display (first 12 characters after prefix)
  const prefix = key.substring(0, API_KEY_PREFIX.length + 8) + '...'

  return { key, hash, prefix }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function validateApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length === API_KEY_PREFIX.length + 64
}
