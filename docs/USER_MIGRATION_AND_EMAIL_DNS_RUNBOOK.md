# User Migration And Email DNS Runbook

## What is happening

1. Duplicate names in leaderboard are separate backend users (different `users._id` / `authId`), usually from test-era auth identities versus current live Clerk identities.
2. `@mahagathe.org` email OTP delivery can fail because DNS mail auth is incomplete/invalid.

## Recommendation (Ockham path)

If preserving test-era progress is not critical, do a controlled production reset of user data and move forward on live auth only.

Why: old test-era Clerk user IDs do not map cleanly to live Clerk user IDs, so automatic migration is high risk and can create silent mismatches.

## Safe reset workflow

The historical `admin:listUsersWithProgress` and `admin:purgeAllUserData`
functions are now internal-only. They cannot be invoked by an app client or
with `npx convex run`. Do not reintroduce a public wrapper that accepts a
maintenance token as a function argument; secrets in function arguments can be
recorded in logs.

### 1) Export a production snapshot

Use the Convex dashboard's production deployment snapshot export and retain the
snapshot for audit/history before any destructive operation.

### 2) Prepare a reviewed one-off migration

Create a temporary, server-authorized maintenance mutation which calls
`internal.admin.purgeAllUserData` with:

```ts
{ confirm: "PURGE_ALL_USER_DATA" }
```

The temporary entry point must be authorized with Convex/Clerk server-side
identity and a deployment-configured admin allowlist. Never ship an
unauthenticated or shared-secret-in-arguments wrapper.

### 3) Purge user data (only if explicitly approved)

Deploy and execute the reviewed migration only after:

- A production snapshot has completed.
- The exact deployment has been confirmed.
- A second reviewer has approved the destructive operation.
- The product owner has explicitly approved the reset.

This clears:
- `activeCommunity`
- `communityMembers`
- `communities`
- `readEvents`
- `dailySets`
- `streaks`
- `bookmarks`
- `bookmarkBuckets`
- `userState`
- `users`

### 4) Verify and remove the one-off migration

Verify the affected tables in the production dashboard, then remove the
temporary entry point and deploy again. `convex/admin.ts` must remain
internal-only.

## If you want migration instead of reset

You need an explicit identity mapping file from legacy users to live users (email-based or manual), then perform per-user merge. Do not auto-merge by display name.

## Fix `@mahagathe.org` OTP delivery

### 1) Keep only ONE SPF TXT record on `mahagathe.org`

Current state has multiple SPF TXT records. Replace with one consolidated record.

Example shape (adjust for your true senders):

```txt
v=spf1 include:spf.protection.outlook.com a mx ip4:182.50.132.194 ~all
```

### 2) Add DMARC record

Host:

```txt
_dmarc.mahagathe.org
```

Value:

```txt
v=DMARC1; p=none; rua=mailto:dmarc@mahagathe.org; adkim=s; aspf=s
```

### 3) Keep Clerk email records verified

- `clkmail.mahagathe.org` CNAME
- `clk._domainkey.mahagathe.org` CNAME
- `clk2._domainkey.mahagathe.org` CNAME

### 4) Validate DNS

```bash
dig +short TXT mahagathe.org
dig +short TXT _dmarc.mahagathe.org
dig +short CNAME clkmail.mahagathe.org
dig +short CNAME clk._domainkey.mahagathe.org
dig +short CNAME clk2._domainkey.mahagathe.org
```

### 5) Validate mailbox delivery path

Because MX points to Microsoft 365, check:
- Inbox
- Junk
- Defender quarantine

## Auth config note

For OTP sign-up to complete without password prompts, Clerk password requirement must not be `Required`.
