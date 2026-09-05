# Bug Re-triage Runbook (MAH-17, MAH-18, MAH-19)

Use this after environment parity is confirmed in `docs/ENVIRONMENT_PARITY_MATRIX.md`.

## Scope

- MAH-17: Non-Google login (email/OTP) flow
- MAH-18: Profile stats missing while leaderboard shows stats
- MAH-19: Auth emails landing in spam
- MAH-20: SMTP/domain setup dependency for MAH-19

## Evidence Bundle Format

For each ticket, provide screenshot bundles with:

1. Timestamp (local timezone)
2. Build profile (`preview` or `production`)
3. Account email used
4. Pass/Fail result per scenario
5. Short note for unexpected behavior

## MAH-17 Verification Matrix

1. Existing account OTP sign-in:
- Enter known email
- Receive code
- Verify code
- Reach app tabs successfully
2. New account OTP sign-up:
- Enter never-used email
- Receive code
- Verify code
- Reach app tabs successfully
3. Wrong code:
- Enter invalid code and verify error is actionable
4. Expired code:
- Wait until expiration and verify retry path is actionable

Acceptance: no dead-end state; user can always recover with resend or retry path.

## MAH-18 Verification Matrix

1. Login with one account in `preview`
2. Capture Social leaderboard row for that account
3. Capture Profile streak/stat card for the same account
4. Sign out and sign back in
5. Capture Social + Profile again

Acceptance: profile stats and leaderboard identity/streak are consistent before and after re-login.

## MAH-19 / MAH-20 SMTP Quick Win

Clerk-side setup:

1. Configure auth email sender for `mahagathe.org` in Clerk.
2. Set sender mailbox (for example `auth@mahagathe.org`).
3. Add required DNS records from Clerk provider instructions:
- SPF
- DKIM
- DMARC

Validation:

1. Trigger OTP emails to at least one Gmail and one Outlook inbox.
2. Capture:
- Inbox placement (Inbox vs Spam/Junk)
- From address
- Authentication result summary in message headers (SPF/DKIM/DMARC)

Acceptance: emails land in inbox for both Gmail and Outlook with authenticated domain sender.

## Decision Rule

1. Reproducible issue:
- Keep issue open
- Attach evidence
- Implement targeted fix
2. Not reproducible:
- Attach evidence bundle
- Close issue with note "Cannot reproduce after parity hardening"
- Create a follow-up monitoring ticket with the same verification matrix

## Linear Hygiene Timing

Do not do full backlog cleanup until these conditions are met:

1. Environment parity check passes
2. MAH-17/18/19 evidence bundles are attached
3. MAH-20 SMTP status is confirmed
