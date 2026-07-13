/* Huemeld native bootstrap — injected before the game script by sync.mjs.
   Provides window.HuemeldNative = { interstitial, buyRemoveAds, buyFull, restore }
   on top of @capacitor-community/admob and @revenuecat/purchases-capacitor.

   ┌─────────────────────────────────────────────────────────────────────┐
   │ FILL THESE IN before shipping (see ../APPSTORE.md, steps 2–4):      │
   └─────────────────────────────────────────────────────────────────────┘ */
var RC_IOS_API_KEY = "test_VjGLGGyGQQEsDWOgAZKpBcOjjMh";       // RevenueCat key (TEST/sandbox — swap for the appl_ production key before App Store release)
var IOS_INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN"; // AdMob → your interstitial ad unit
var ADMOB_TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/4411468910"; // Google's official iOS test id
var USE_TEST_ADS = true;                                        // flip to false for release
var PRODUCT_NOADS = "com.izge.huemeld.noads";                   // $2.99 non-consumable
var PRODUCT_FULL = "com.izge.huemeld.everything";               // $4.99 non-consumable
var ENT_NOADS = "noads", ENT_FULL = "everything";               // RevenueCat entitlement ids

(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;   // web build: no bridge
  var P = cap.Plugins || {};
  var AdMob = P.AdMob, Purchases = P.Purchases;
  var adUnit = USE_TEST_ADS ? ADMOB_TEST_INTERSTITIAL : IOS_INTERSTITIAL_ID;
  var adReady = false, attAsked = false;

  function prepareAd() {
    if (!AdMob) return;
    AdMob.prepareInterstitial({ adId: adUnit }).then(function () { adReady = true; })
      .catch(function () { adReady = false; });
  }

  /* ATT: ask in context — right before the FIRST ad would show (post-honeymoon),
     not at cold start. Reviewers like the prompt to make sense. */
  function ensureATT() {
    if (attAsked || !AdMob) return Promise.resolve();
    attAsked = true;
    return AdMob.requestTrackingAuthorization().catch(function () {});
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
    if (AdMob) AdMob.initialize({}).then(prepareAd).catch(function () {});
    if (Purchases) {
      Purchases.configure({ apiKey: RC_IOS_API_KEY })
        .then(function () { return Purchases.getCustomerInfo(); })
        .then(function (res) { pushEnts(entsOf(res)); })
        .then(pushSave)
        .catch(function () {});
    }
  });
})();
