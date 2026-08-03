# Android dependency security audit

Audit date: 2026-07-31

Release baseline: `codex/android-production-fixes` at `469dca0`

## Policy

`npm run audit:production` runs `npm audit --omit=dev --json` and fails on every
critical or high advisory unless the advisory has been individually reviewed and
is listed as tooling-only in the gate. Exceptions use an exact npm advisory ID,
not a package-name or severity-wide exclusion, so a new advisory in Expo, React
Native, or another dependency still fails the gate.

Expo includes its CLI, Metro, code-generation, config, and testing packages below
the `expo` and `react-native` production dependency roots. Consequently,
`npm audit --omit=dev` reports those build tools as production dependencies even
though Metro excludes them from the release application bundle. Reachability
below describes whether vulnerable code can execute in the installed Android
application.

## Baseline classification and remediation

The baseline audit reported 34 affected packages: 3 critical, 14 high,
16 moderate, and 1 low.

After remediation, the raw npm audit reports 32 affected packages: 0 critical,
18 high, 13 moderate, and 1 low. The apparent increase from 14 to 18 high
packages is npm's dependency-cascade accounting: all 18 are parent packages
affected by the same single tooling-only `brace-expansion` advisory described
below. At the advisory-record level, critical/high findings fell from 49 to 1;
runtime-reachable critical/high findings fell to 0.

| Baseline finding | Severity | Android production reachability | Resolution |
| --- | --- | --- | --- |
| `@clerk/clerk-expo`, `@clerk/clerk-js`, `@clerk/clerk-react`, `@clerk/shared`, `js-cookie` | Critical/high | Runtime: authentication SDK code is bundled | Updated Clerk Expo to `2.19.42`, which resolves to fixed Clerk packages |
| `lodash` | High | Runtime-transitive through the prior Clerk tree | Removed from the vulnerable tree by the Clerk update |
| `ws` | High | Mixed: Clerk web dependencies plus Metro/dev middleware | Patched every vulnerable 6.x, 7.x, and 8.x instance |
| `shell-quote` | Critical | Tooling only: React Native DevTools | Patched within 1.x |
| `tar` | Critical | Tooling only: Expo CLI archive handling | Patched within 7.x |
| `@isaacs/brace-expansion`, `brace-expansion`, `minimatch` | High | Tooling only: Expo CLI/config, React Native codegen, Metro/Jest globbing | Patched every installed `brace-expansion` major to a compatible fixed release |
| `@xmldom/xmldom` | High | Tooling only: Expo plist/config generation | Patched within 0.8.x |
| `js-yaml` | High | Tooling only: Expo formatting and Jest coverage config | Patched within the installed 3.x and 4.x lines |
| `picomatch` | High | Tooling only: Tailwind, Metro, Jest file matching | Patched within each installed major |
| `postcss` | High | Tooling only: Tailwind/Metro CSS transformation | Updated within PostCSS 8; the sole override is required because Expo pins `~8.4.x`, for which no fixed release exists |
| `undici` | High | Tooling only: Expo CLI networking | Patched within 6.x |
| Expo/config/prebuild/asset/auth/linking/notification aggregate findings; `uuid`, `xcode`, `yaml`, `viem` | Moderate | Build/config tooling or an aggregate inherited from the packages above | High/critical causes patched; remaining moderate advisories are reported for future SDK upgrades |
| `@babel/core` | Low | Tooling only: Babel source-map processing | Residual low severity; reported by the audit |

## Reviewed residual

There are no accepted critical/high advisory exceptions. On 2026-07-31,
`GHSA-mh99-v99m-4gvg` expanded to cover older 1.x and 2.x releases, and fixed
compatible releases became available. The committed lockfile now resolves the
affected paths to `brace-expansion` 1.1.18, 2.1.4, and 5.0.9. Moderate and low
tooling findings remain visible for a future Expo SDK upgrade.

## Maintenance

Run both commands before each store release:

```sh
npm run audit:production
npm audit
```

Any new critical/high advisory fails `audit:production`. Moderate and low
findings remain visible in both the command output and CI logs.
