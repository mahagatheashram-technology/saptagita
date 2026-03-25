# User Migration And Email DNS Runbook

## What is happening

1. Duplicate names in leaderboard are separate backend users (different `users._id` / `authId`), usually from test-era auth identities versus current live Clerk identities.
2. `@mahagathe.org` email OTP delivery can fail because DNS mail auth is incomplete/invalid.

## Recommendation (Ockham path)

If preserving test-era progress is not critical, do a controlled production reset of user data and move forward on live auth only.

Why: old test-era Clerk user IDs do not map cleanly to live Clerk user IDs, so automatic migration is high risk and can create silent mismatches.

## Safe reset workflow

### 1) Deploy maintenance functions

```bash
npx convex deploy
```

### 2) Set a one-time maintenance token on production Convex

```bash
npx convex env set ADMIN_MAINTENANCE_TOKEN "<strong-random-token>" --prod
```

### 3) Export snapshot before any destructive action

```bash
npx convex run admin:listUsersWithProgress --prod '{"token":"<strong-random-token>"}'
```

Save this output in a file for audit/history.

### 4) Purge user data (only if explicitly approved)

```bash
npx convex run admin:purgeAllUserData --prod '{"token":"<strong-random-token>","confirm":"PURGE_ALL_USER_DATA"}'
```

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

### 5) Verify after purge

```bash
npx convex run admin:listUsersWithProgress --prod '{"token":"<strong-random-token>"}'
```

Expected: `totalUsers: 0`.

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
