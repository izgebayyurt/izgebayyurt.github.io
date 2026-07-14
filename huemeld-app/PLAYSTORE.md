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
- [ ] Add two ad units → **Interstitial** and **Rewarded**. Copy both unit IDs (`ca-app-pub-…/…`).
- [ ] In `native.js`: set `ANDROID_INTERSTITIAL_ID` and `ANDROID_REWARDED_ID`.

## 3. RevenueCat — Google Play app
- [ ] RevenueCat → your Huemeld project → **Add app → Google Play** → package `com.griezwahlm.huemeld`.
- [ ] Copy the **public Google API key** (`goog_…`) → paste into `RC_ANDROID_API_KEY` in `native.js`.
- [ ] Google Play service credentials (so RC can validate purchases): Play Console → **Setup → API access** → create/link a **service account**, grant it **Financial data / Manage orders** and **View app info**, then upload its JSON key in RevenueCat's Google Play app settings. (RevenueCat's "Google Play" setup guide walks through it.)
- [ ] **Products are shared across stores** — the same RevenueCat entitlements (`no_ads`, `huemeld_pro`) power both. After you create the Play products (step 5), **attach them to those same entitlements** (exactly like you did for the App Store products — this is what makes the app unlock).

## 4. Play Console — create the app
- [ ] Play Console → **Create app** → name **Huemeld**, Game, Free, package `com.griezwahlm.huemeld`.

## 5. Play Console — the two in-app products
Monetize → **In-app products** → create two **one-time (managed) products** with IDs matching iOS + RevenueCat exactly:

| Product ID | Name | Price |
|---|---|---|
| `huemeld_no_ads` | Remove Ads | ~$2.99 |
| `huemeld_pro` | Huemeld Pro | ~$4.99 |

- [ ] Activate both. Then attach them to the RevenueCat entitlements (step 3).

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
- **Cross-reinstall save**: iOS mirrors progress to iCloud (the CloudKV plugin). Android has no equivalent wired — progress persists through app updates but a **delete + reinstall loses it** unless you add a backup (Android Auto Backup is enabled via `allowBackup="true"`, but WebView localStorage isn't reliably included). Fine for v1; tell me if you want Play Games Saved Games or a Drive backup added.
- **ATT** is iOS-only; on Android there's no tracking prompt. For EEA/UK users you may later add a **UMP consent form** (GDPR) via the AdMob plugin — not required to launch elsewhere.
- **Icons/splash**: Android currently uses the default Capacitor launcher icon. Generate a proper Android icon set (`@capacitor/assets` or Android Studio's Image Asset tool) before release.
