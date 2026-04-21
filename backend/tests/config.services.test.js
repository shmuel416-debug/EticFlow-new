/**
 * EthicFlow — Service config tests
 * Verifies default and env-driven provider resolution.
 */

import {
  getAIProvider,
  getEmailProvider,
  getStorageProvider,
  getCalendarProvider,
} from '../src/config/services.js'

/**
 * Returns a cleanup function restoring changed env vars.
 * @param {string[]} keys
 * @returns {() => void}
 */
function captureEnv(keys) {
  const backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  return () => {
    keys.forEach((key) => {
      if (backup[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = backup[key]
      }
    })
  }
}

describe('service provider config', () => {
  test('uses documented defaults when env vars are missing', () => {
    const restore = captureEnv([
      'AI_PROVIDER',
      'EMAIL_PROVIDER',
      'STORAGE_PROVIDER',
      'CALENDAR_PROVIDER',
    ])

    delete process.env.AI_PROVIDER
    delete process.env.EMAIL_PROVIDER
    delete process.env.STORAGE_PROVIDER
    delete process.env.CALENDAR_PROVIDER

    expect(getAIProvider()).toBe('mock')
    expect(getEmailProvider()).toBe('console')
    expect(getStorageProvider()).toBe('local')
    expect(getCalendarProvider()).toBe('internal')

    restore()
  })

  test('returns env values when explicitly provided', () => {
    const restore = captureEnv([
      'AI_PROVIDER',
      'EMAIL_PROVIDER',
      'STORAGE_PROVIDER',
      'CALENDAR_PROVIDER',
    ])

    process.env.AI_PROVIDER = 'gemini'
    process.env.EMAIL_PROVIDER = 'gmail'
    process.env.STORAGE_PROVIDER = 's3'
    process.env.CALENDAR_PROVIDER = 'google'

    expect(getAIProvider()).toBe('gemini')
    expect(getEmailProvider()).toBe('gmail')
    expect(getStorageProvider()).toBe('s3')
    expect(getCalendarProvider()).toBe('google')

    restore()
  })
})
