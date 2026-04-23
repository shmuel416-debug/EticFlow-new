/**
 * EthicFlow — AnnounceRegion
 * Mount once at the app root. Renders two SR-only aria-live regions
 * (polite + assertive) used by the useAnnounce() hook.
 */

import React from 'react'
import { LIVE_ID, ASSERTIVE_ID } from '../../hooks/useAnnounce'

export default function AnnounceRegion() {
  return (
    <>
      <div id={LIVE_ID} aria-live="polite" aria-atomic="true" className="lev-sr-only" />
      <div id={ASSERTIVE_ID} aria-live="assertive" aria-atomic="true" className="lev-sr-only" />
    </>
  )
}
