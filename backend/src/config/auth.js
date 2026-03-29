/**
 * EthicFlow — Auth Configuration
 * JWT settings and bcrypt rounds loaded from environment variables.
 * Validates that required secrets are present on startup.
 */

/**
 * Validates that JWT_SECRET is set and sufficiently long.
 * Throws in production if missing; warns in development.
 * @returns {void}
 */
function validateAuthConfig() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    const msg = 'JWT_SECRET must be set and at least 32 characters long'
    if (process.env.NODE_ENV === 'production') throw new Error(msg)
    console.warn(`⚠️  WARNING: ${msg}`)
  }
}

validateAuthConfig()

const authConfig = {
  jwt: {
    secret:             process.env.JWT_SECRET ?? 'dev_secret_change_in_production',
    expiresIn:          process.env.JWT_EXPIRES_IN ?? '8h',
    refreshExpiresIn:   process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
}

export default authConfig
