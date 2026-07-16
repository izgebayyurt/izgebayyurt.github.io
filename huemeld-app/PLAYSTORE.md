# Huemeld — Google Play ship checklist

The same Capacitor wrapper that ships to the App Store runs on Android. The web
game, ads (AdMob), purchases (RevenueCat), haptics and music are all shared —
you only add **Google-side accounts + a few Android-specific IDs**. Work top to
bottom.

**What's already in the repo**

| Thing | Where |
|---|---|
| Android project (generated, AdMob + RevenueCat + Haptics wired) | `huemeld-app/android/` |
| Platform-aware native bridge (picks iOS vs Android keys/IDs) | `huemeld-app/native.js` |
| Portrait lock, AD_ID permission, AdMob app-id meta-data | `android/app/src/main/AndroidManifest.xml` |
| Package name `com.griezwahlm.huemeld`, app name "Huemeld" | `android/app/build.gradle`, `res/values/strings.xml` |

---

## 1. Accounts (one-time)
- [ ] **Google Play Console** developer account — one-time **$25** at play.google.com/console.
- [ ] Reuse your existing **AdMob** and **RevenueCat** accounts.

## 2. AdMob — Android app + units
- [ ] AdMob → Apps → **Add app → Android** → "Huemeld".
- [ ] Copy the **App ID** (`ca-app-pub-…~…`, with the `~`) → paste into `android/app/src/main/AndroidManifest.xml` (the `com.google.android.gms.ads.APPLICATION_ID` meta-data; currently Google's sample id).
- [ ] Add a **Rewarded** ad unit. Copy its unit ID (`ca-app-pub-…/…`). (No interstitial needed — Huemeld shows **no forced ads**; ads are opt-in only: a rewarded hint, or "watch to unlock 8 pack levels". You can skip the Interstitial unit.)
- [ ] In `native.js`: set `ANDROID_INTERSTITIAL_ID` and `ANDROID_REWARDED_ID`.

## 3. RevenueCat — Google Play app
- [ ] RevenueCat → your Huemeld project → **Add app → Google Play** → package `com.griezwahlm.huemeld`.
- [ ] Copy the **public Google API key** (`goog_…`) → paste into `RC_ANDROID_API_KEY` in `native.js`.
- [ ] Google Play service credentials (so RC can validate purchases): Play Console → **Setup → API access** → create/link a **service account**, grant it **Financial data / Manage orders** and **View app info**, then upload its JSON key in RevenueCat's Google Play app settings. (RevenueCat's "Google Play" setup guide walks through it.)
- [ ] **Products are shared across stores** — the same RevenueCat entitlements (`no_ads`, `huemeld_pro`) power both. After you create the Play products (step 5), **attach them to those same entitlements** (exactly like you did for the App Store products — this is what makes the app unlock).

## 4. Play Console — create the app
- [ ] Play Console → **Create app** → name **Huemeld**, Game, Free, package `com.griezwahlm.huemeld`.

## 5. Play Console — the in-app product
Monetize → **In-app products** → create **one** one-time (managed) product with the ID matching iOS + RevenueCat exactly:

| Product ID | Name | Price |
|---|---|---|
| `huemeld_pro` | Huemeld Pro | **$2.99** |

- [ ] Activate it. Then attach it to the RevenueCat `huemeld_pro` entitlement (step 3).
- [ ] **Do NOT create `huemeld_no_ads`.** It's retired — the app shows no forced ads, so there's nothing to "remove". Ship Pro only. (iOS keeps the old product live only so past buyers can restore.)
- [ ] Set the **Turkey** price sensibly — the auto price from $2.99 USD may be high for local purchasing power; lower it if so.

## 6. Build the app bundle (Android Studio)
On a machine with **Android Studio + JDK 17**:

```bash
cd huemeld-app
npm install
npm run android          # sync-www + cap sync android + open Android Studio
```

In Android Studio:
- [ ] Let Gradle sync. Bump **versionCode**/**versionName** in `android/app/build.gradle` for each upload.
- [ ] **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**. Create an upload keystore (keep it safe) and enroll in **Play App Signing**.
- [ ] SDK: `compileSdk`/`targetSdk` should be 34+ (Play requires a recent target API). Capacitor 6 defaults are current; bump if Play flags it.

## 7. Internal testing pass
- [ ] Play Console → **Testing → Internal testing** → upload the `.aab`, add your email as a tester, install via the opt-in link.
- [ ] License testers (for IAP sandbox): Play Console → **Setup → License testing** → add your Google account. Purchases then run in test mode (no real charge).
- [ ] Verify, in order:
  - [ ] Game boots, plays, dark theme, music + haptics work.
  - [ ] Solve 15 levels → an ad shows (test ads while `USE_TEST_ADS = true`).
  - [ ] **Hint** → rewarded test video → ghost pipe.
  - [ ] Settings shows **Remove Ads** / **Huemeld Pro** / **Restore Purchases**; buy one (license tester) → it unlocks; **Restore** brings it back on reinstall.

## 8. Store listing
- [ ] **Title**: `Huemeld` · **Short description** (80): `Mix colors, fill the board.`
- [ ] **Full description**: reuse the App Store copy in `APPSTORE.md` §8 (Google allows ~4000 chars).
- [ ] **App icon**: 512×512 PNG. **Feature graphic**: 1024×500 PNG (required).
- [ ] **Phone screenshots**: 2–8, **1080×1920** (or any 9:16). ⚠️ The iOS shots (1284×2778) are **too tall** for Play (Play caps the long:short ratio at 2:1) — regenerate at 1080×1920. Ask and I'll produce them.
- [ ] **Category**: Games › Puzzle. **Content rating**: fill the questionnaire → Everyone. **Privacy Policy**: `https://izgebayyurt.github.io/huemeld/privacy.html`.

## 9. Data safety (Google's App-Privacy equivalent)
Because AdMob uses the advertising ID:
- [ ] "Does your app collect or share user data?" → **Yes**.
- [ ] **Device or other IDs** — collected, shared with third parties, purpose **Advertising or marketing**; used for tracking.
- [ ] **App activity → App interactions / Advertising data** — Advertising; not linked to identity.
- [ ] **Purchase history** (RevenueCat) — App functionality; not linked.
- [ ] Everything else: not collected.

## 10. Release
- [ ] Flip `USE_TEST_ADS = false` in `native.js` **and** `UNLOCK_ALL = false` in `../huemeld/flow2.html`. Re-run `npm run android`, rebuild the `.aab`, bump versionCode.
- [ ] Fill `ANDROID_INTERSTITIAL_ID`, `ANDROID_REWARDED_ID`, `RC_ANDROID_API_KEY`, and the real AdMob **App ID** in the manifest.
- [ ] Upload to the **Production** track, roll out. First reviews are usually hours–days.

## Notes / known gaps
- **Cross-reinstall save**: the save mirror now writes to **@capacitor/preferences** (native SharedPreferences) on Android, in addition to iCloud on iOS. Every `hm_flow2_*` key is captured (progress, settings, language, rewarded-unlocks). Because `allowBackup="true"` and Preferences use SharedPreferences, **Android Auto Backup includes them**, so a delete+reinstall restores — *provided the device has Google backup on* (Settings → Google → Backup) and a backup has run. It also survives app updates. (Play Games Saved Games is a heavier alternative if you ever want cloud saves that don't depend on Auto Backup.)
- **ATT** is iOS-only; on Android there's no tracking prompt. For EEA/UK users you may later add a **UMP consent form** (GDPR) via the AdMob plugin — not required to launch elsewhere.
- **Icons/splash**: Android currently uses the default Capacitor launcher icon. Generate a proper Android icon set (`@capacitor/assets` or Android Studio's Image Asset tool) before release.
