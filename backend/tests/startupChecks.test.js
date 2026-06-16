/**
 * EthicFlow — startup check tests.
 * Verifies optional dependencies cannot block unrelated API startup.
 */

import { jest } from '@jest/globals'
import { checkPdfRendererStartup } from '../src/startupChecks.js'

/**
 * Creates a logger mock for startup check assertions.
 * @returns {{ log: jest.Mock, warn: jest.Mock }}
 */
function makeLogger() {
  return {
    log: jest.fn(),
    warn: jest.fn(),
  }
}

describe('startup checks', () => {
  test('reports available PDF renderer', async () => {
    const logger = makeLogger()
    const assertRendererAvailable = jest.fn(async () => {})

    await expect(checkPdfRendererStartup(assertRendererAvailable, logger)).resolves.toBe(true)

    expect(assertRendererAvailable).toHaveBeenCalledTimes(1)
    expect(logger.log).toHaveBeenCalledWith('PDF renderer ready')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('continues startup when PDF renderer is unavailable', async () => {
    const logger = makeLogger()
    const assertRendererAvailable = jest.fn(async () => {
      throw new Error('Chromium executable missing')
    })

    await expect(checkPdfRendererStartup(assertRendererAvailable, logger)).resolves.toBe(false)

    expect(logger.log).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      'PDF renderer unavailable; continuing API startup without PDF generation.',
      'Chromium executable missing'
    )
  })
})
