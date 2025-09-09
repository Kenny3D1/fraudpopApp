// fraudpop.js – minimal capture (App Proxy friendly)
(function () {
  try {
    console.log("hi");
    var sid =
      crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2);

    var shopDomain = window.Shopify && Shopify.shop ? Shopify.shop : "unknown";

    // cart token is not always present on every page; try a safe fallback
    var checkoutToken =
      window.Shopify && Shopify.checkout && Shopify.checkout.token
        ? Shopify.checkout.token
        : null;

    var payload = {
      shop_id: shopDomain,
      session_id: sid,
      device_id: null, // TODO: inject FingerprintJS later
      cart_token: checkoutToken,
      email: null, // Intentionally null in MVP; use Checkout UI / Thank-you page later
    };

    console.info("[FraudPop] capture payload", payload);
    var url = window.FRAUDPOP_CAPTURE_URL || "/apps/fraudpop/v1/capture";

    var send = function (body) {
      try {
        if (navigator.sendBeacon) {
          var blob = new Blob([JSON.stringify(body)], {
            type: "application/json",
          });
          navigator.sendBeacon(url, blob);
          return;
        }
      } catch (e) {}
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      })
        .then((r) => {
          console.info("[FraudPop] capture response", r.status);
        })
        .catch(function () {});
    };
    send(payload);
  } catch (e) {}
})();
