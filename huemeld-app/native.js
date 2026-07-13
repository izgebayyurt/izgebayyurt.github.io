/* Huemeld native bootstrap — injected before the game script by sync.mjs.
   Provides window.HuemeldNative = { interstitial, buyRemoveAds, buyFull, restore }
   on top of @capacitor-community/admob and @revenuecat/purchases-capacitor.

   ┌─────────────────────────────────────────────────────────────────────┐
   │ FILL THESE IN before shipping (see ../APPSTORE.md, steps 2–4):      │
   └─────────────────────────────────────────────────────────────────────┘ */
var RC_IOS_API_KEY = "appl_EORtDZXyCAbQuULpxKCowUMwcGG";       // RevenueCat public Apple API key (production)
var IOS_INTERSTITIAL_ID = "ca-app-pub-1320023287922220/7689139513"; // AdMob → your interstitial ad unit
var IOS_REWARDED_ID = "ca-app-pub-1320023287922220/1175702057";    // AdMob → your rewarded ad unit (hint videos)
var ADMOB_TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/4411468910"; // Google's official iOS test id
var ADMOB_TEST_REWARDED = "ca-app-pub-3940256099942544/1712485313";     // Google's official iOS rewarded test id
var USE_TEST_ADS = false;                                       // RELEASE: real ad units
var PRODUCT_NOADS = "huemeld_no_ads";                          // $2.99 non-consumable (App Store product ID)
var PRODUCT_FULL = "huemeld_pro";                              // $4.99 non-consumable (App Store product ID)
var ENT_NOADS = "no_ads", ENT_FULL = "huemeld_pro";            // RevenueCat entitlement ids

(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // web build: no bridge
  var P = cap.Plugins || {};
  var AdMob = P.AdMob, Purchases = P.Purchases;
  var adUnit = USE_TEST_ADS ? ADMOB_TEST_INTERSTITIAL : IOS_INTERSTITIAL_ID;
  var rewardUnit = USE_TEST_ADS ? ADMOB_TEST_REWARDED : IOS_REWARDED_ID;
  var adReady = false, attAsked = false, attInFlight = false;
  var rewardReady = false, rewardGot = false, rewardCb = null, rewardWired = false;

  function prepareAd() {
    if (!AdMob) return;
    AdMob.prepareInterstitial({ adId: adUnit }).then(function () { adReady = true; })
      .catch(function () { adReady = false; });
  }

  /* ---- rewarded video: the player watches one to reveal a hint pipe ----
     Reward is confirmed by the onRewardedVideoAdReward event (fired only if the
     video played to the end); onRewardedVideoAdDismissed then reports the result
     back — got=true only when the reward actually fired, so closing early = no hint. */
  function prepareReward() {
    if (!AdMob) return;
    AdMob.prepareRewardVideoAd({ adId: rewardUnit }).then(function () { rewardReady = true; })
      .catch(function () { rewardReady = false; });
  }
  function wireReward() {
    if (rewardWired || !AdMob) return;
    rewardWired = true;
    AdMob.addListener("onRewardedVideoAdReward", function () { rewardGot = true; });
    AdMob.addListener("onRewardedVideoAdDismissed", function () {
      var cb = rewardCb; rewardCb = null; rewardReady = false; prepareReward();
      if (cb) cb(rewardGot);
    });
    AdMob.addListener("onRewardedVideoAdFailedToShow", function () {
      var cb = rewardCb; rewardCb = null; rewardReady = false; prepareReward();
      if (cb) cb(false);
    });
  }

  /* ATT: iOS only PRESENTS the tracking dialog while the app is in the *active*
     state. At a cold launch the webview loads while the app is still 'inactive'
     (splash/launch), so a request made then is silently ignored — status stays
     'notDetermined', no dialog. So we request only once the page is visible, and
     if it still didn't take (status came back notDetermined), we leave attAsked
     false so a later attempt (a staggered timer, an app-foreground, or the first
     interstitial) tries again. requestTrackingAuthorization is a no-op once the
     status is decided, so retrying is harmless. */
  function ensureATT() {
    if (attAsked || attInFlight || !AdMob) return Promise.resolve();
    attInFlight = true;
    return AdMob.trackingAuthorizationStatus().then(function (res) {
      if (res && res.status && res.status !== "notDetermined") { attAsked = true; return; } // already decided
      return AdMob.requestTrackingAuthorization().then(function () {
        return AdMob.trackingAuthorizationStatus().then(function (r2) {
          if (r2 && r2.status && r2.status !== "notDetermined") attAsked = true; // prompt shown + answered
        });
      });
    }).catch(function () {}).then(function () { attInFlight = false; });
  }
  /* Fire ensureATT once the app is genuinely active: a few staggered attempts on
     cold launch (each waits for the app to settle into 'active'), plus retries on
     the next foreground. The in-flight + attAsked guards keep it to one dialog. */
  function scheduleATT() {
    if (!AdMob) return;
    var fire = function () { if (!attAsked && document.visibilityState === "visible") ensureATT(); };
    [400, 1200, 2500].forEach(function (ms) { setTimeout(fire, ms); });
    document.addEventListener("visibilitychange", fire);
    window.addEventListener("focus", fire);
  }

  function entsOf(info) {
    var act = info && info.customerInfo && info.customerInfo.entitlements && info.customerInfo.entitlements.active || {};
    return { noads: !!act[ENT_NOADS] || !!act[ENT_FULL], full: !!act[ENT_FULL] };
  }
  function pushEnts(e) { if (window.__applyEnt) window.__applyEnt(e); }

  function buy(productId, entKey, cb) {
    if (!Purchases) { cb(false); return; }
    Purchases.purchaseStoreProduct({ product: { identifier: productId } })
      .catch(function () {
        // fallback path for plugin versions that take the id directly
        return Purchases.purchaseProduct({ productIdentifier: productId });
      })
      .then(function (res) {
        var e = entsOf(res);
        cb(entKey === "full" ? e.full : e.noads);
      })
      .catch(function () { cb(false); });
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
    rewarded: function (cb) {
      if (!AdMob) { cb(false); return; }
      if (!rewardReady) { prepareReward(); cb(false); return; }   // not loaded yet — the game asks the player to retry
      ensureATT().then(function () {
        rewardGot = false; rewardCb = cb; rewardReady = false;
        AdMob.showRewardVideoAd().catch(function () { var c = rewardCb; rewardCb = null; prepareReward(); if (c) c(false); });
      });
    },
    buyRemoveAds: function (cb) { buy(PRODUCT_NOADS, "noads", cb); },
    buyFull: function (cb) { buy(PRODUCT_FULL, "full", cb); },
    restore: function (cb) {
      if (!Purchases) { cb(null); return; }
      Purchases.restorePurchases().then(function (res) { cb(entsOf(res)); })
        .catch(function () { cb(null); });
    },
  };

  /* ---- save mirror: localStorage -> iCloud key-value store (CloudKV plugin).
     Deleting + reinstalling the app wipes the webview's localStorage; the
     mirror restores it on first boot (same iCloud account). ---- */
  var CloudKV = P.CloudKV;
  var SAVE_KEYS = ["hm_flow2_done","hm_flow2_packdone","hm_flow2_daily","hm_flow2_solves","hm_flow2_i",
    "hm_flow2_seen","hm_flow2_mech","hm_flow2_forktip","hm_flow2_addue",
    "hm_flow2_ent_full","hm_flow2_ent_noads","hm_flow2_noads",
    "hm_flow2_theme","hm_flow2_sound","hm_flow2_cb"];
  var lastPushed = "";
  // snapshot NOW: native.js runs before the game script, which writes
  // hm_flow2_seen at boot and would otherwise mask a fresh install
  var freshInstall = !(localStorage.getItem("hm_flow2_done") || localStorage.getItem("hm_flow2_solves") || localStorage.getItem("hm_flow2_seen"));
  function collectSave() {
    var o = {};
    SAVE_KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v != null) o[k] = v; });
    return JSON.stringify(o);
  }
  function pushSave() {
    if (!CloudKV) return;
    var save = collectSave();
    if (save === lastPushed || save === "{}") return;   // nothing new / nothing at all
    lastPushed = save;
    CloudKV.set({ key: "hmsave", value: save }).catch(function () { lastPushed = ""; });
  }
  function restoreSave() {
    if (!CloudKV) return;
    // only a FRESH install restores (no progress before this page loaded); one reload applies it
    if (!freshInstall || sessionStorage.getItem("hm_restored")) return;
    CloudKV.get({ key: "hmsave" }).then(function (res) {
      var v = res && res.value;
      if (!v) return;
      var o = JSON.parse(v), n = 0;
      SAVE_KEYS.forEach(function (k) { if (o[k] != null) { localStorage.setItem(k, o[k]); n++; } });
      if (n) { sessionStorage.setItem("hm_restored", "1"); location.reload(); }
    }).catch(function () {});
  }
  // push whenever the app backgrounds, plus a slow heartbeat while playing
  document.addEventListener("visibilitychange", function () { if (document.hidden) pushSave(); });
  window.addEventListener("pagehide", pushSave);
  setInterval(pushSave, 45000);
  restoreSave();   // fire immediately — the sooner the reload, the less flash

  // boot: ads engine + purchases SDK + entitlement sync (covers reinstalls)
  document.addEventListener("DOMContentLoaded", function () {
    // ATT at launch: initialize AdMob, then present the tracking prompt as soon as
    // the app is active (scheduleATT handles the timing). Ads are prepared right
    // away; the 15-solve honeymoon means the first real ad is minutes away, long
    // after the tracking decision has resolved.
    if (AdMob) AdMob.initialize({}).then(function () {
      scheduleATT(); wireReward(); prepareAd(); prepareReward();
    }).catch(function () {});
    if (Purchases) {
      Purchases.configure({ apiKey: RC_IOS_API_KEY })
        .then(function () { return Purchases.getCustomerInfo(); })
        .then(function (res) { pushEnts(entsOf(res)); })
        .then(pushSave)
        .catch(function () {});
    }
  });
})();
