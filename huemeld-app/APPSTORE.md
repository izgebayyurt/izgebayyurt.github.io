# Huemeld — iOS ship checklist

Everything you need to go from this repo to "Waiting for Review".
Work top to bottom; each step tells you exactly what to paste where.

**What's already in the repo**

| Thing | Where |
|---|---|
| Capacitor wrapper (AdMob + RevenueCat wired) | `huemeld-app/` |
| Native bridge with placeholders to fill | `huemeld-app/native.js` |
| 8 App Store screenshots, 6.9" (1320×2868, JPEG) | `huemeld-app/store-assets/screen-*.jpg` |
| IAP promo images (1024×1024) | `huemeld-app/store-assets/iap-*.png` |
| App icon, App Store size (1024×1024) | `huemeld-app/store-assets/appicon-1024.png` |
| Privacy policy (live once pushed) | https://izgebayyurt.github.io/huemeld/privacy.html |

---

## 1. Accounts (one-time)

- [ ] Enroll in the **Apple Developer Program** ($99/yr) at developer.apple.com with your Apple ID.
- [ ] Create a **Google AdMob** account at admob.google.com (uses your Google account; hook up payment info later — required before real payouts, not before launch).
- [ ] Create a free **RevenueCat** account at app.revenuecat.com.

## 2. AdMob (5 minutes)

- [ ] AdMob → Apps → **Add app** → iOS → "Huemeld" (say "not yet listed" — you can link the store listing after launch).
- [ ] Copy the **App ID** — looks like `ca-app-pub-1234567890123456~0987654321` (note the `~`). You'll paste it into Info.plist in step 6.
- [ ] Inside the app → **Ad units → Add ad unit → Interstitial**, name it "solve-break". Copy the **unit ID** (`ca-app-pub-…/…` with a `/`).
- [ ] In `huemeld-app/native.js`: set `IOS_INTERSTITIAL_ID` to that unit ID. Leave `USE_TEST_ADS = true` until step 9.

## 3. RevenueCat (10 minutes)

- [ ] New project "Huemeld" → **Add app** → App Store → bundle ID `com.izge.huemeld`.
- [ ] Copy the **public Apple API key** (starts `appl_`) → paste into `RC_IOS_API_KEY` in `huemeld-app/native.js`. **NOTE:** the file currently holds a `test_` sandbox key for development — replace it with the `appl_` production key before the App Store release build.
- [ ] Products → add both (identifiers must match ASC exactly, step 5):
  - `com.izge.huemeld.noads`
  - `com.izge.huemeld.everything`
- [ ] Entitlements → create **`noads`** and attach `com.izge.huemeld.noads`.
- [ ] Entitlements → create **`everything`** and attach `com.izge.huemeld.everything`.
  (The bridge treats `everything` as implying no-ads, so you don't need to double-attach.)
- [ ] Later (step 5 makes this possible): paste the **App-Specific Shared Secret** from ASC into RevenueCat's App Store app settings so receipts validate.

## 4. App Store Connect — app record

- [ ] developer.apple.com → Certificates, IDs & Profiles → **Identifiers → +** → App ID `com.izge.huemeld` (capabilities: none needed; In-App Purchase is on by default).
- [ ] appstoreconnect.apple.com → My Apps → **+ New App**:
  - Platform iOS · Name **Huemeld** · Primary language English · Bundle ID `com.izge.huemeld` · SKU `huemeld-001`.

## 5. App Store Connect — the two IAPs

Monetization → In-App Purchases → **+** (both are **Non-Consumable**):

| Field | No Ads | Huemeld Pro |
|---|---|---|
| Reference name | Remove Ads | Huemeld Pro |
| Product ID | `com.izge.huemeld.noads` | `com.izge.huemeld.everything` |
| Price | $2.99 (Tier 3) | $4.99 (Tier 5) |
| Display name | Remove Ads | Huemeld Pro |
| Description | No more ad breaks — ever. | All 7 packs, the 150-level Medley, daily archive, and every chapter unlocked. No ads. |

- [ ] Each IAP needs a **review screenshot**: use `store-assets/screen-03-packs.jpg` (a Medley board showing the pack mechanics) — any real in-app image ≥640px is accepted.
- [ ] Optional but nice: upload `iap-noads-1024.png` / `iap-everything-1024.png` as the **promotional images** (App Store Promotion section) so the IAPs can be featured on your product page.
- [ ] Monetization → App-Specific Shared Secret → generate → paste into RevenueCat (step 3 last box).
- [ ] Both IAPs must be attached to the version in step 8 ("In-App Purchases" section on the version page) the first time they ship.

## 6. Build the Xcode project

The Xcode project is **already generated and configured** in `huemeld-app/ios/`
(Info.plist has the ATT string, `GADApplicationIdentifier` placeholder, and
SKAdNetworkItems; the app icon and dark wordmark splash are in the asset
catalog; iPhone is locked to portrait). On your Mac:

```bash
cd huemeld-app
npm install
node sync.mjs            # builds www/ from ../huemeld with the native bridge injected
npx cap sync ios         # copies www/ into the app + runs pod install
npx cap open ios         # opens Xcode
```

In Xcode:

- [ ] Target → Signing & Capabilities → pick your team; bundle ID should read `com.izge.huemeld`.
- [ ] Same tab: **+ Capability → iCloud → check "Key-value storage"** (the entitlements file `App/App.entitlements` is already wired in — this just registers the service on your App ID). It powers the save mirror: delete + reinstall restores progress from iCloud.
- [ ] `ios/App/App/Info.plist`: `GADApplicationIdentifier` currently holds Google's SAMPLE app id (`…3940256099942544~1458002511`) so dev builds run with test ads out of the box — replace it with your real AdMob **App ID** from step 2 (the one with `~`) before the release build.
- [ ] Same file: SKAdNetworkItems currently has Google's own entry (`cstr6suwn9.skadnetwork`) — paste the rest of [Google's current list](https://developers.google.com/admob/ios/quick-start#update_your_infoplist) (~50 entries) for better ad attribution. Optional but recommended.

Notes:
- The ATT prompt fires **in-app, lazily** — `native.js` requests tracking authorization right before the *first* interstitial (after the 15-solve honeymoon), so reviewers see it in a sensible context. Nothing else to wire.
- If iOS 18+ Xcode warns about a missing `PrivacyInfo.xcprivacy`, the AdMob & RevenueCat pods ship their own; the app itself only uses localStorage (User Defaults-equivalent, exempt reason `CA92.1`) — add the manifest only if App Store Connect flags it at upload.

## 7. TestFlight pass (sandbox everything)

- [ ] Product → Archive → Distribute → App Store Connect → upload.
- [ ] ASC → TestFlight → add yourself as internal tester, install via TestFlight app.
- [ ] Verify, in order:
  - [ ] Game boots, plays, dark theme, no service-worker weirdness (the wrapper strips it).
  - [ ] Solve 15 levels → next 4th solve shows the **ATT prompt** then a **test interstitial** (test ads are on).
  - [ ] Settings shows **Remove Ads · $2.99**, **✦ Huemeld Pro · $4.99**, **Restore Purchases** (they're hidden on web, bridge-gated).
  - [ ] Sandbox-buy No Ads (ASC → Users & Access → Sandbox Testers if you want a separate test Apple ID) → ads stop, button disappears.
  - [ ] Delete app, reinstall, **Restore Purchases** → entitlement comes back.
  - [ ] Sandbox-buy Huemeld Pro → all packs, Medley, daily archive, and locked chapters open instantly.
  - [ ] Open a pack for the first time → the "New mechanic" card pops once; **Watch how it works** runs the ghost demo and returns; the card never re-appears; the pack's picker page has "How it works" to rewatch.
  - [ ] Force-quit the app the moment an ad should show (every 4th solve past 15) → relaunch → the owed ad shows on the very next solve.
  - [ ] Play a few levels, background the app (saves push to iCloud), delete it, reinstall from TestFlight → progress is back after first launch (same iCloud account).
- [ ] Flip `USE_TEST_ADS = false` in `native.js` **and** `UNLOCK_ALL = false` in `huemeld/flow2.html` (the dev switch that opens every chapter/pack level), re-run `node sync.mjs && npx cap sync ios`, re-archive, re-upload. **This is the build you submit.**

## 8. Store listing (paste-ready)

**Name** (30 max): `Huemeld`
**Subtitle** (30 max): `Mix colors. Fill the board.`

**Promotional text** (170 max, editable without review):
> A color-mixing puzzle with 250 free levels, a daily puzzle, and seven mechanic packs — portals, prisms, bridges, counters and more.

**Description**:

```
Draw pipes of light. Where they meet, colors mix.

Huemeld is a color-mixing puzzle: every board has glowing sources and
empty squares that need exactly the right hue. Red and yellow mix into
orange. Blue and yellow make green. All three primaries? That's brown —
if you can route them together.

Fill the whole board. Leave nothing dark.

EASY TO LEARN
• Draw a line from each glowing circle
• Lines that meet in a junction mix into a new color
• Light every square and cover the board to win

HARD TO PUT DOWN
• 250 free levels across five chapters
• A new daily puzzle every day — keep your streak alive
• Undo, unlimited retries, no timers, no move limits
• Color-blind labels, sound toggle, light & dark themes

SEVEN PUZZLE PACKS (350 more levels)
• Brown — chain all three primaries into deep blends
• Arrows — ride them straight through, the way they point
• Ice — frozen tiles keep your line running straight
• Portals — pink spirals teleport your flow across the board
• Overpass — cross two lines over each other
• Prisms — feed a secondary in, two primaries burst out
• Numbers — counter tiles demand exactly N cells of their color

…and the MEDLEY: 150 levels that stack mechanics together —
portals with brown chains, prisms over bridges, and worse.

FAIR PRICING
The 250-level campaign and the daily puzzle are free, with occasional
ads after your first levels. One purchase removes ads forever. One more
unlocks everything — every pack, the Medley, the daily archive, and
instant chapter unlocks. No subscriptions, no energy, no coins.

Every one of the 840 levels is verified solvable. Usually in
more ways than one — but never as many as you'd hope.
```

**Keywords** (100 max, no spaces after commas):
`color,colour,mix,pipe,flow,connect,logic,puzzle,zen,brain,daily,relax,line,paint,blend`
(93 characters — room to tweak.)

**Category**: Primary **Games › Puzzle**, secondary **Games › Board** (or Entertainment).
**Age rating** questionnaire: everything "No" → **4+**. (Set "Unrestricted Web Access: No".)
**Copyright**: `© 2026 Izge Bayyurt`
**Support URL**: `https://izgebayyurt.github.io/huemeld/`
**Marketing URL** (optional): same.
**Privacy Policy URL**: `https://izgebayyurt.github.io/huemeld/privacy.html`

**Screenshots** — upload the eight from `store-assets/` in this order (the 6.9" slot: 1320×2868 is the canonical size, and Apple auto-scales for every smaller iPhone; JPEG because ASC rejects PNGs with an alpha channel):
1. `screen-01-hero.jpg` — Mix colors and drag the lines to their matching square!
2. `screen-02-levels.jpg` — 250+ levels with different board sizes
3. `screen-03-packs.jpg` — Try custom packs with 8+ unique mechanics: bridges, portals, prisms and more!
4. `screen-04-portals.jpg` — Warp through portals
5. `screen-05-bridges.jpg` — Cross over bridges
6. `screen-06-prisms.jpg` — Split light with prisms
7. `screen-07-numbers.jpg` — Crack the number clues
8. `screen-08-daily.jpg` — A new puzzle every day!

## 9. App Privacy questionnaire (ASC → App Privacy)

Because AdMob serves ads (and may use the IDFA when the user allows tracking):

- [ ] "Do you collect data?" → **Yes**.
- [ ] **Identifiers → Device ID**: used for **Third-Party Advertising**; **linked to identity: No**; **used for tracking: Yes**.
- [ ] **Usage Data → Advertising Data** (ad interactions): Third-Party Advertising; not linked; tracking: Yes.
- [ ] **Diagnostics → Crash/Performance**: only if you later add a crash SDK — currently **not collected**.
- [ ] Purchases (RevenueCat receipts) count as **Purchase History**: App Functionality; **not linked** (anonymous ID); tracking: No.
- [ ] Everything else: not collected.

(If you'd rather answer "tracking: No", you must serve only non-personalized ads and skip ATT — the current build asks, so answer Yes.)

## 10. Submit

- [ ] Version page → attach the release build from step 7's second upload.
- [ ] Attach both IAPs to the version.
- [ ] **App Review notes**, paste:
  > Free puzzle game with two one-time purchases. To reach ads quickly: ads only start after 15 solved levels (then every 4th solve; the ATT prompt appears right before the first ad). Purchases: Settings (gear icon) → "Remove Ads" / "Huemeld Pro" / "Restore Purchases". No account or login required.
- [ ] Release option: "Automatically release after approval" (or manual if you want to coordinate).
- [ ] Submit for review. First reviews typically take 1–3 days.

## Common rejection traps (already handled, don't undo them)

- **Restore button missing** → present in Settings (Apple requires it for non-consumables).
- **Privacy policy URL dead** → push this branch so `privacy.html` is live *before* submitting.
- **ATT prompt wording** → the Info.plist string explains benefit + reassurance; don't shorten it to "for ads".
- **Test ads in production** → step 7 flips `USE_TEST_ADS` before the submitted build.
- **IAP not attached to version** → step 10.
- **Placeholder metadata** — double-check you replaced every `XXXX` in `native.js` and Info.plist.

## Android (later)

The same wrapper works: `npx cap add android`, AdMob Android app ID in `AndroidManifest.xml`, a `goog_` RevenueCat key (add a platform switch in `native.js`), Play Console listing. The screenshots regenerate at any size by editing `storeshots.mjs` viewport. Park it until iOS is live.
