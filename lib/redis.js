import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const API_KEY_PREFIX = 'apikey:'
export const API_KEY_SET = 'apikey:index' // Set untuk tracking semua keys
export const MAIL_SET_PREFIX = 'mailindex:' // Set untuk tracking email per inbox

export function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'tm_'
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function getExpiryTimestamp(days) {
  return Date.now() + Number(days) * 24 * 60 * 60 * 1000
}

export function safeParse(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}