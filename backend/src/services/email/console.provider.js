/**
 * EthicFlow — Console Email Provider (DEV)
 * Prints emails to the terminal instead of sending them.
 * Switch to smtp/microsoft/gmail via EMAIL_PROVIDER env var.
 */

/**
 * Logs an email to the console with formatted output.
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 */
export async function send({ to, subject, html }) {
  const divider = '─'.repeat(60)
  console.log(`\n📧 [Email Console Provider]`)
  console.log(divider)
  console.log(`To:      ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(divider)
  // Strip HTML tags for readable console output
  console.log(html.replace(/<[^>]*>/g, '').trim())
  console.log(divider + '\n')
}
