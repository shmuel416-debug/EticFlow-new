/**
 * Ethic-Net — product branding constants for user-facing output.
 */

/** Canonical product name shown in PDF footers and system-generated documents. */
export const PRODUCT_NAME = 'Ethic-Net'

/** Hebrew institution display name fallback for PDF headers. */
export const INSTITUTION_NAME_HE =
  process.env.INSTITUTION_NAME_HE || 'המוסד האקדמי'

/** English institution display name fallback for PDF headers. */
export const INSTITUTION_NAME_EN =
  process.env.INSTITUTION_NAME_EN || 'Academic Institution'
