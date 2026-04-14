# Integration Credentials Setup

This guide lists what you need for each third-party integration, where to put it in the CRM, and what is currently testable.

## Where To Enter Connector Credentials

For workspace-scoped third-party integrations, use:

`Settings -> Integrations`

For each editable connector, the CRM supports these fields:

- `Auth Type`
- `Account / Tenant`
- `Base URL`
- `Client ID`
- `Client Secret`
- `Redirect URI`
- `Scopes`
- `Enable sync`
- `Mark connector active`

Do not put these OAuth secrets in frontend code or `VITE_*` env vars. Enter them through the workspace integration form so they stay tenant-scoped in the backend registry.

## Current Status

These connectors are currently in the codebase:

- `Google Workspace`
- `Microsoft 365`
- `Slack`
- `Salesforce`
- `HubSpot`
- `QuickBooks`
- `Xero`

Current implementation depth:

- `Microsoft 365`: OAuth start/callback/exchange UI is wired, refresh-token endpoint exists, manual email/calendar sync endpoints exist.
- `Google Workspace`: OAuth setup/callback/exchange UI is wired, but provider-backed mailbox/calendar sync is not finished yet.
- `Slack`, `Salesforce`, `HubSpot`, `QuickBooks`, `Xero`: connector configuration and OAuth-ready setup exist, but live sync behavior is not finished yet.

## Redirect URIs To Register

Use these exact local callback URLs in the provider apps for local testing:

- `Google Workspace`: `http://localhost:5173/settings/integrations/google/callback`
- `Microsoft 365`: `http://localhost:5173/settings/integrations/microsoft/callback`
- `Slack`: `http://localhost:5173/settings/integrations/slack/callback`
- `Salesforce`: `http://localhost:5173/settings/integrations/salesforce/callback`
- `HubSpot`: `http://localhost:5173/settings/integrations/hubspot/callback`
- `QuickBooks`: `http://localhost:5173/settings/integrations/quickbooks/callback`
- `Xero`: `http://localhost:5173/settings/integrations/xero/callback`

If you test against a deployed frontend later, register that deployed callback URL as well.

## What You Need Per Provider

### Microsoft 365

Needed:

- Azure app registration
- `Client ID`
- `Client Secret`
- optional `Tenant / Account` label for your own reference

Recommended values:

- `Base URL`: `https://graph.microsoft.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `offline_access Mail.Read Mail.Send Calendars.ReadWrite`
- `Redirect URI`: `http://localhost:5173/settings/integrations/microsoft/callback`

Azure app setup:

1. Go to Azure Portal.
2. Open `App registrations`.
3. Create a new app or use an existing one.
4. Add the redirect URI above under web platform redirects.
5. Create a client secret.
6. Make sure delegated permissions include:
   - `offline_access`
   - `Mail.Read`
   - `Mail.Send`
   - `Calendars.ReadWrite`
7. Grant admin consent if your tenant requires it.

Where to put it:

- `Settings -> Integrations -> Microsoft 365`

What you can test after setup:

- `Start OAuth`
- complete provider consent in browser
- callback page exchange
- connector becomes connected
- `Email -> Sync Outlook`
- `Calendar -> Sync Outlook`

### Google Workspace

Needed:

- Google Cloud OAuth client
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://www.googleapis.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar`
- `Redirect URI`: `http://localhost:5173/settings/integrations/google/callback`

Google setup:

1. Go to Google Cloud Console.
2. Configure OAuth consent screen.
3. Create OAuth credentials for a web application.
4. Add the redirect URI above.
5. Copy the client ID and secret.

Where to put it:

- `Settings -> Integrations -> Google Workspace`

What will be testable after setup:

- OAuth start/callback/exchange

What is not fully finished yet:

- provider-backed Gmail and Google Calendar sync

### Slack

Needed:

- Slack app
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://slack.com/api`
- `Auth Type`: `OAUTH2`
- `Scopes`: `chat:write incoming-webhook channels:read`
- `Redirect URI`: `http://localhost:5173/settings/integrations/slack/callback`

Where to put it:

- `Settings -> Integrations -> Slack`

Current status:

- config and OAuth-ready setup only

### Salesforce

Needed:

- Salesforce connected app
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://login.salesforce.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `api refresh_token`
- `Redirect URI`: `http://localhost:5173/settings/integrations/salesforce/callback`

Where to put it:

- `Settings -> Integrations -> Salesforce`

Current status:

- config and OAuth-ready setup only

### HubSpot

Needed:

- HubSpot app credentials
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://api.hubapi.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `crm.objects.contacts.read oauth`
- `Redirect URI`: `http://localhost:5173/settings/integrations/hubspot/callback`

Where to put it:

- `Settings -> Integrations -> HubSpot`

Current status:

- config and OAuth-ready setup only

### QuickBooks

Needed:

- Intuit app credentials
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://quickbooks.api.intuit.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `com.intuit.quickbooks.accounting`
- `Redirect URI`: `http://localhost:5173/settings/integrations/quickbooks/callback`

Where to put it:

- `Settings -> Integrations -> QuickBooks`

Current status:

- config and OAuth-ready setup only

### Xero

Needed:

- Xero app credentials
- `Client ID`
- `Client Secret`

Recommended values:

- `Base URL`: `https://api.xero.com`
- `Auth Type`: `OAUTH2`
- `Scopes`: `offline_access accounting.transactions accounting.contacts`
- `Redirect URI`: `http://localhost:5173/settings/integrations/xero/callback`

Where to put it:

- `Settings -> Integrations -> Xero`

Current status:

- config and OAuth-ready setup only

## SMTP Email Delivery

SMTP is not configured from the workspace integrations screen. It is environment-based on the backend.

Set these in the backend environment:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_SMTP_AUTH`
- `MAIL_SMTP_STARTTLS_ENABLE`
- `MAIL_DEBUG`

Where:

- `backend/.env`
- or your Docker/runtime environment for [docker-compose.run.yml](C:\Users\cni.alad\Documents\Projects\Projects\Cicosy-CRM\ai-native-crm\backend\docker-compose.run.yml)

## Recommended Test Order

Use this order so we can validate the most complete path first:

1. `Microsoft 365`
2. `Google Workspace`
3. `Slack`
4. `Salesforce`
5. `HubSpot`
6. `QuickBooks`
7. `Xero`

## Microsoft 365 Test Checklist

After you add the Microsoft credentials:

1. Open `Settings -> Integrations -> Microsoft 365`
2. Save:
   - `Client ID`
   - `Client Secret`
   - `Redirect URI`
   - `Scopes`
   - `Enable sync`
   - `Mark connector active`
3. Click `Start OAuth`
4. Complete consent in Microsoft
5. Let the provider return to:
   - `http://localhost:5173/settings/integrations/microsoft/callback`
6. Confirm the connector shows connected state
7. Open `Email`
8. Click `Sync Outlook`
9. Open `Calendar`
10. Click `Sync Outlook`

Expected result:

- imported Outlook emails appear in CRM email records
- imported Outlook calendar events appear in CRM calendar records

## What To Send Me When You’re Ready

Once you have the provider credentials ready, send me:

- which provider you want to test first
- confirmation that the provider redirect URI has been registered
- confirmation that the client ID and secret have been saved in `Settings -> Integrations`

Then I can take the next pass and help you run the live end-to-end test.
