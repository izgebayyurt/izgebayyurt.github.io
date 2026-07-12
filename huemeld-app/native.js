/* Huemeld native bootstrap — injected before the game script by sync.mjs.
   Provides window.HuemeldNative = { interstitial, buyRemoveAds, buyFull, restore }
   on top of @capacitor-community/admob and @revenuecat/purchases-capacitor.

   ┌─────────────────────────────────────────────────────────────────────┐
   │ FILL THESE IN before shipping (see ../APPSTORE.md, steps 2–4):      │
   └─────────────────────────────────────────────────────────────────────┘ */
var RC_IOS_API_KEY = "appl_XXXXXXXXXXXXXXXXXXXXXXXX";          // RevenueCat → Project → API keys
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
        if (!adReady) { prepareAd(); return; }        // not loaded yet: skip this slot quietly
        adReady = false;
        AdMob.showInterstitial().finally(prepareAd);   // show, then preload the next
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

  // boot: ads engine + purchases SDK + entitlement sync (covers reinstalls)
  document.addEventListener("DOMContentLoaded", function () {
    if (AdMob) AdMob.initialize({}).then(prepareAd).catch(function () {});
    if (Purchases) {
      Purchases.configure({ apiKey: RC_IOS_API_KEY })
        .then(function () { return Purchases.getCustomerInfo(); })
        .then(function (res) { pushEnts(entsOf(res)); })
        .catch(function () {});
    }
  });
})();
