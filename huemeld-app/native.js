/* Huemeld native bootstrap — injected before the game script by sync.mjs.
   Provides window.HuemeldNative = { rewarded, buyFull, restore, privacyChoices, haptic }
   (+ the retired interstitial / buyRemoveAds, kept so old call sites stay harmless)
   on top of @capacitor-community/admob and @revenuecat/purchases-capacitor.

   ┌─────────────────────────────────────────────────────────────────────┐
   │ FILL THESE IN before shipping (see ../APPSTORE.md, steps 2–4):      │
   └─────────────────────────────────────────────────────────────────────┘ */
// ---- iOS ----
var RC_IOS_API_KEY = "appl_EORtDZXyCAbQuULpxKCowUMwcGG";       // RevenueCat public Apple API key (production)
var IOS_INTERSTITIAL_ID = "ca-app-pub-1320023287922220/7689139513"; // AdMob → iOS interstitial ad unit
var IOS_REWARDED_ID = "ca-app-pub-1320023287922220/1175702057";    // AdMob → iOS rewarded ad unit (hint videos)
// ---- Android (fill these in before the Play Store release — see PLAYSTORE.md) ----
var RC_ANDROID_API_KEY = "goog_XXXXXXXXXXXXXXXXXXXXXXXXXX";     // RevenueCat public Google API key
var ANDROID_INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN"; // AdMob → Android interstitial ad unit
var ANDROID_REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN";     // AdMob → Android rewarded ad unit
// ---- Google's official test ad units (per platform) ----
var IOS_TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/4411468910",  IOS_TEST_REWARDED = "ca-app-pub-3940256099942544/1712485313";
var AND_TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712",  AND_TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917";
var USE_TEST_ADS = false;                                       // RELEASE: real ad units
// products + entitlements are shared across stores (name the Google Play products the
// same as the App Store ones and attach both to these RevenueCat entitlements)
var PRODUCT_NOADS = "huemeld_no_ads";                          // non-consumable / one-time product ID
var PRODUCT_FULL = "huemeld_pro";                              // non-consumable / one-time product ID
var ENT_NOADS = "no_ads", ENT_FULL = "huemeld_pro";            // RevenueCat entitlement ids

(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // web build: no bridge
  var isAndroid = cap.getPlatform && cap.getPlatform() === "android";
  var RC_API_KEY = isAndroid ? RC_ANDROID_API_KEY : RC_IOS_API_KEY;
  var P = cap.Plugins || {};
  var AdMob = P.AdMob, Purchases = P.Purchases, Haptics = P.Haptics;
  var adUnit = USE_TEST_ADS ? (isAndroid ? AND_TEST_INTERSTITIAL : IOS_TEST_INTERSTITIAL) : (isAndroid ? ANDROID_INTERSTITIAL_ID : IOS_INTERSTITIAL_ID);
  var rewardUnit = USE_TEST_ADS ? (isAndroid ? AND_TEST_REWARDED : IOS_TEST_REWARDED) : (isAndroid ? ANDROID_REWARDED_ID : IOS_REWARDED_ID);
  // Android IDs still placeholders? Then keep ads + purchases OFF on that platform
  // (fail cleanly as "unavailable") instead of firing broken requests at AdMob/RevenueCat.
  var PLACEHOLDER = /X{6}|N{6}/;
  if (PLACEHOLDER.test(rewardUnit)) AdMob = null;   // rewarded is the only ad format in use
  if (PLACEHOLDER.test(RC_API_KEY)) Purchases = null;
  var adReady = false, attAsked = false, attInFlight = false;
  var rewardReady = false, rewardGot = false, rewardCb = null, rewardWired = false;
  var rewardLoading = null, rewardShowing = false;
  // hold the game's audio while a full-screen ad plays (focus/pageshow can't restart it)
  function audioOff() { if (window.__audioHold) window.__audioHold("ad", true); else if (window.__suspendAudio) window.__suspendAudio(); }
  function audioOn() { if (window.__audioHold) window.__audioHold("ad", false); else if (window.__resumeAudio) window.__resumeAudio(); }

  function prepareAd() {
    if (!AdMob) return;
    AdMob.prepareInterstitial({ adId: adUnit }).then(function () { adReady = true; })
      .catch(function () { adReady = false; });
  }

  /* ---- rewarded video: the player watches one to reveal a hint pipe ----
     Reward is confirmed by the onRewardedVideoAdReward event (fired only if the
     video played to the end); onRewardedVideoAdDismissed then reports the result
     back — got=true only when the reward actually fired, so closing early = no hint. */
  // one load at a time; resolves true once a video is ready, false if the load failed
  function prepareReward() {
    if (!AdMob) return Promise.resolve(false);
    if (rewardReady) return Promise.resolve(true);
    if (rewardLoading) return rewardLoading;
    rewardLoading = AdMob.prepareRewardVideoAd({ adId: rewardUnit })
      .then(function () { rewardReady = true; return true; })
      .catch(function () { rewardReady = false; return false; })
      .then(function (ok) { rewardLoading = null; return ok; });
    return rewardLoading;
  }
  // the ad is over (finished, closed early, or failed): report + reload the next one
  function rewardDone(got) {
    var cb = rewardCb; rewardCb = null; rewardReady = false; rewardShowing = false;
    audioOn(); prepareReward();
    if (cb) cb(got, got ? undefined : "closed");
  }
  function wireReward() {
    if (rewardWired || !AdMob) return;
    rewardWired = true;
    AdMob.addListener("onRewardedVideoAdReward", function () { rewardGot = true; });
    AdMob.addListener("onRewardedVideoAdDismissed", function () { rewardDone(rewardGot); });
    AdMob.addListener("onRewardedVideoAdFailedToShow", function () {
      var cb = rewardCb; rewardCb = null; rewardReady = false; rewardShowing = false;
      audioOn(); prepareReward();
      if (cb) cb(false, "unavailable");
    });
  }

  /* ATT is presented natively at launch, from AppDelegate.applicationDidBecomeActive
     (iOS only shows the dialog while the app is active, which the webview can't
     guarantee at page-load). This is only a BACKSTOP: if the status is somehow still
     undetermined by the time the first interstitial is due, ask then. Harmless if the
     native prompt already ran — requestTrackingAuthorization no-ops once decided. */
  function ensureATT() {
    if (attAsked || attInFlight || !AdMob) return Promise.resolve();
    attInFlight = true;
    return AdMob.trackingAuthorizationStatus().then(function (res) {
      if (res && res.status && res.status !== "notDetermined") { attAsked = true; return; } // already decided
      return AdMob.requestTrackingAuthorization();
    }).catch(function () {}).then(function () { attInFlight = false; });
  }

  /* GDPR (EEA/UK/CH): Google's UMP consent form, shown before ads initialise when the
     region requires it. Needs a published GDPR message in AdMob → Privacy & messaging;
     elsewhere the status is NOT_REQUIRED and this is a quick no-op. Any error falls
     through, so ads still start. */
  function gatherConsent() {
    if (!AdMob || !AdMob.requestConsentInfo) return Promise.resolve();
    return AdMob.requestConsentInfo().then(function (info) {
      if (info && info.status === "REQUIRED" && info.isConsentFormAvailable) return AdMob.showConsentForm();
    }).catch(function () {});
  }

  function entsOf(info) {
    var act = info && info.customerInfo && info.customerInfo.entitlements && info.customerInfo.entitlements.active || {};
    return { noads: !!act[ENT_NOADS] || !!act[ENT_FULL], full: !!act[ENT_FULL] };
  }
  // e comes from RevenueCat's CustomerInfo (the source of truth): the game sets AND clears
  // its flags from it, so refunds revoke. Only ever called with a successful read.
  function pushEnts(e) { if (window.__applyEnt) window.__applyEnt(e, true); }

  function buy(productId, entKey, cb) {
    if (!Purchases) { cb(false); return; }
    // Always report the TRUE entitlement state read back from RevenueCat after the
    // attempt — the source of truth. This handles every case correctly:
    //   • fresh purchase      -> entitlement now active  -> unlock
    //   • already-owned IAP   -> StoreKit completes without a new transaction, or
    //                            purchaseStoreProduct rejects "already purchased";
    //                            getCustomerInfo still shows it owned -> unlock
    //   • user cancelled      -> no entitlement -> false
    // It also pushes entitlements so the UI updates even if the callback is missed.
    function reconcile() {
      Purchases.getCustomerInfo()
        .then(function (res) { var e = entsOf(res); pushEnts(e); cb(entKey === "full" ? e.full : e.noads); })
        .catch(function () { cb(false); });
    }
    // purchaseStoreProduct needs a REAL StoreProduct from the store (a synthesized
    // {identifier} is rejected). Fetch it first, then purchase that object.
    Purchases.getProducts({ productIdentifiers: [productId], type: "NON_SUBSCRIPTION" })   // Android defaults to subs
      .then(function (res) {
        var product = res && res.products && res.products[0];
        if (!product) { reconcile(); return; }               // fetch odd? still check existing entitlements
        return Purchases.purchaseStoreProduct({ product: product }).then(reconcile, reconcile);
      })
      .catch(reconcile);
  }

  window.HuemeldNative = {
    interstitial: function () {
      if (!AdMob) return;
      ensureATT().then(function () {
        if (!adReady) { prepareAd(); return; }        // not loaded yet: the due flag keeps it owed
        adReady = false;
        AdMob.showInterstitial()
          .then(function () { if (window.__adShown) window.__adShown(); })  // only a SHOWN ad clears the slot
          .finally(prepareAd);
      });
    },
    /* cb(got, reason): got=true only when the video played to the end.
       reason: "unavailable" (no video could load in time / failed to show),
               "closed" (closed early), "busy" (one is already playing). */
    rewarded: function (cb) {
      if (!AdMob) { cb(false, "unavailable"); return; }
      if (rewardShowing) { cb(false, "busy"); return; }
      rewardShowing = true;
      // not loaded yet (first tap after launch, slow network)? wait up to 8 s for it
      var timeout = new Promise(function (res) { setTimeout(function () { res(false); }, 8000); });
      Promise.race([prepareReward(), timeout]).then(function (ok) {
        if (!ok || !rewardReady) { rewardShowing = false; cb(false, "unavailable"); return; }
        ensureATT().then(function () {
          rewardGot = false; rewardCb = cb; rewardReady = false;
          audioOff();   // a full-screen ad doesn't hide the webview: silence the game music
          AdMob.showRewardVideoAd().catch(function () {
            var c = rewardCb; rewardCb = null; rewardShowing = false; audioOn(); prepareReward();
            if (c) c(false, "unavailable");
          });
        });
      });
    },
    // Settings → "Privacy choices": let EEA/UK players change their consent (Google requires it)
    privacyChoices: function (cb) {
      cb = cb || function () {};
      if (!AdMob || !AdMob.requestConsentInfo) { cb(false); return; }
      var reset = AdMob.resetConsentInfo ? AdMob.resetConsentInfo() : Promise.resolve();
      reset.then(function () { return AdMob.requestConsentInfo(); })
        .then(function (info) {
          if (info && info.isConsentFormAvailable) return AdMob.showConsentForm().then(function () { cb(true); });
          cb(false);
        })
        .catch(function () { cb(false); });
    },
    haptic: function (kind) {
      if (!Haptics) return;
      try {
        if (kind === "success") Haptics.notification({ type: "SUCCESS" });
        else if (kind === "error") Haptics.notification({ type: "ERROR" });
        else if (kind === "medium") Haptics.impact({ style: "MEDIUM" });
        else Haptics.impact({ style: "LIGHT" });
      } catch (e) {}
    },
    buyRemoveAds: function (cb) { buy(PRODUCT_NOADS, "noads", cb); },
    buyFull: function (cb) { buy(PRODUCT_FULL, "full", cb); },
    restore: function (cb) {
      if (!Purchases) { cb(null); return; }
      Purchases.restorePurchases().then(function (res) { var e = entsOf(res); pushEnts(e); cb(e); })
        .catch(function () { cb(null); });
    },
  };

  /* ---- save mirror: localStorage -> durable native storage, restored on a fresh
     install (deleting/reinstalling wipes the webview's localStorage). Two durable
     stores are written, best-effort:
       • CloudKV  (iCloud NSUbiquitousKeyValueStore, iOS) - cross-device + reinstall
       • Preferences (@capacitor/preferences: UserDefaults / SharedPreferences) -
         survives app UPDATES on both platforms, and Android reinstall via Auto Backup
     EVERY hm_flow2_* key is captured (dynamic), so settings, language and the
     rewarded-unlock progress (hm_flow2_adunlock_*) all come back too. ---- */
  var CloudKV = P.CloudKV, Prefs = P.Preferences;
  var SAVE_PREFIX = "hm_flow2_", SAVE_KEY = "hmsave";
  // purchase flags are NOT mirrored: iCloud is per Apple ID, purchases are per store account,
  // and RevenueCat re-reports the real entitlements on every launch anyway
  var ENT_PREFIX = "hm_flow2_ent_";
  function saveable(k) { return k && k.indexOf(SAVE_PREFIX) === 0 && k.indexOf(ENT_PREFIX) !== 0 && k !== "hm_flow2_noads"; }
  var lastPushed = "";
  // snapshot NOW: native.js runs before the game script, which writes
  // hm_flow2_seen at boot and would otherwise mask a fresh install
  var freshInstall = !(localStorage.getItem("hm_flow2_done") || localStorage.getItem("hm_flow2_solves") || localStorage.getItem("hm_flow2_seen"));
  function collectSave() {
    var o = {};
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (saveable(k)) o[k] = localStorage.getItem(k); }
    return JSON.stringify(o);
  }
  function durableSet(value) {   // write to every available durable store
    if (CloudKV) CloudKV.set({ key: SAVE_KEY, value: value }).catch(function () {});
    if (Prefs) Prefs.set({ key: SAVE_KEY, value: value }).catch(function () {});
  }
  function durableGet() {        // read the freshest available (iCloud preferred), Promise<string|null>
    return new Promise(function (resolve) {
      function fromPrefs(seed) {
        if (!Prefs) { resolve(seed); return; }
        Prefs.get({ key: SAVE_KEY }).then(function (r) { resolve(seed || (r && r.value) || null); }).catch(function () { resolve(seed); });
      }
      if (CloudKV) CloudKV.get({ key: SAVE_KEY }).then(function (r) { fromPrefs((r && r.value) || null); }).catch(function () { fromPrefs(null); });
      else fromPrefs(null);
    });
  }
  function pushSave() {
    if (!CloudKV && !Prefs) return;
    var save = collectSave();
    if (save === lastPushed || save === "{}") return;   // nothing new / nothing at all
    lastPushed = save;
    durableSet(save);
  }
  function restoreSave() {
    if (!CloudKV && !Prefs) return;
    // only a FRESH install restores (no progress before this page loaded); one reload applies it
    if (!freshInstall || sessionStorage.getItem("hm_restored")) return;
    durableGet().then(function (v) {
      if (!v) return;
      var o; try { o = JSON.parse(v); } catch (e) { return; }
      var n = 0;
      Object.keys(o).forEach(function (k) { if (saveable(k) && o[k] != null) { localStorage.setItem(k, o[k]); n++; } });
      if (n) { sessionStorage.setItem("hm_restored", "1"); location.reload(); }
    }).catch(function () {});
  }
  // push whenever the app backgrounds, plus a slow heartbeat while playing
  document.addEventListener("visibilitychange", function () { if (document.hidden) pushSave(); });
  window.addEventListener("pagehide", pushSave);
  setInterval(pushSave, 45000);
  restoreSave();   // fire immediately — the sooner the reload, the less flash

  // app foreground/background: resume music on return, and PAUSE it on leaving so it
  // doesn't keep playing in the background (visibilitychange can be flaky in a webview).
  if (P.App && P.App.addListener) {
    try {
      // appStateChange fires on ANY loss of focus (app switcher, Control Center, calls),
      // not just full backgrounding: hold the audio until the app is active again
      function setInactive(on) {
        if (window.__audioHold) window.__audioHold("inactive", on);
        else if (on) { if (window.__suspendAudio) window.__suspendAudio(); }
        else if (window.__resumeAudio) window.__resumeAudio();
      }
      P.App.addListener("appStateChange", function (s) { if (s) setInactive(!s.isActive); });
      P.App.addListener("pause", function () { setInactive(true); });
      P.App.addListener("resume", function () { setInactive(false); });
    } catch (e) {}
  }

  // boot: ads engine + purchases SDK + entitlement sync (covers reinstalls)
  document.addEventListener("DOMContentLoaded", function () {
    // ATT is requested natively at launch (AppDelegate). Here we just spin up the
    // ads engine + rewarded video; by the time the first ad is due (post-honeymoon)
    // the tracking decision has long since resolved.
    if (AdMob) gatherConsent().then(function () { return AdMob.initialize({}); }).then(function () {
      wireReward(); prepareReward();
    }).catch(function () {});
    if (Purchases) {
      // any entitlement change (purchase, restore, renewal, cross-device sync) pushes
      // to the game immediately — so the UI unlocks even if a buy() callback is missed.
      try {
        Purchases.addCustomerInfoUpdateListener(function (info) {
          pushEnts(entsOf({ customerInfo: info && info.customerInfo ? info.customerInfo : info }));
        });
      } catch (e) {}
      Purchases.configure({ apiKey: RC_API_KEY })
        .then(function () { return Purchases.getCustomerInfo(); })
        .then(function (res) { pushEnts(entsOf(res)); })
        .then(pushSave)
        .then(function () {   // show the store's LOCALIZED price on the buy buttons (e.g. "₺49,99")
          return Purchases.getProducts({ productIdentifiers: [PRODUCT_FULL], type: "NON_SUBSCRIPTION" }).then(function (res) {
            var pr = res && res.products && res.products[0];
            if (pr && pr.priceString && window.__applyPrices) window.__applyPrices({ full: pr.priceString });
          });
        })
        .catch(function () {});
    }
  });
})();
