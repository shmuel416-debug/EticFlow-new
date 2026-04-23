# EthicFlow Ops Scripts

Operational scripts to execute go-live tasks quickly and consistently.

## Scripts

- `generate-prod-secrets.ps1`
  - Generates strong values for `JWT_SECRET`, `DB_PASSWORD`, `CALENDAR_TOKEN_ENCRYPTION_KEY`, and prints required auth TTL/origin fields.
- `setup-microsoft-integrations.ps1`
  - Creates Azure AD app registrations for Microsoft SSO, Calendar, and Mail and prints matching `.env` variables.
- `setup-google-personal-calendar.ps1`
  - Enables Google Calendar API and prints exact manual OAuth console steps and resulting `.env` fields.
- `run-backup-rollback-drill.ps1`
  - Runs backup/restore + runtime restart drill commands for Docker Compose production stack.

## Example

```powershell
pwsh ./ops/scripts/generate-prod-secrets.ps1 -FrontendUrl "https://ethics.example.ac.il"
pwsh ./ops/scripts/setup-microsoft-integrations.ps1 -TenantId "<tenant>" -BaseUrl "https://ethics.example.ac.il" -OrganizerEmail "ethics@example.ac.il"
pwsh ./ops/scripts/setup-google-personal-calendar.ps1 -ProjectId "<project-id>" -BaseUrl "https://ethics.example.ac.il"
pwsh ./ops/scripts/run-backup-rollback-drill.ps1 -DryRun
```
