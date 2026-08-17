((root, factory) => {
  const toast = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = toast;
  }

  root.noComparisonsToast = toast;
  if (root.document) {
    toast.initialize(root);
  }
})(globalThis, () => {
  const marker = "#no-comparisons-redirected";
  const message =
    "Redirected. Let not your mind run on what you lack as much as on what you have already";

  const withMarker = (destination) => {
    const url = new URL(destination);
    url.hash = marker;
    return url.href;
  };

  const consumeMarker = ({ history, location }) => {
    const url = new URL(location.href);
    if (url.hash !== marker) {
      return false;
    }

    url.hash = "";
    history.replaceState(history.state, "", url.href);
    return true;
  };

  const show = ({ document, requestAnimationFrame, setTimeout }) => {
    const mount = () => {
      const parent = document.body || document.documentElement;
      if (!parent) {
        requestAnimationFrame(mount);
        return;
      }

      document.getElementById("no-comparisons-toast")?.remove();
      const element = document.createElement("div");
      element.id = "no-comparisons-toast";
      element.textContent = message;
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      Object.assign(element.style, {
        background: "rgba(31, 35, 40, 0.96)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "8px",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.22)",
        color: "#ffffff",
        font: "13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        left: "50%",
        maxWidth: "min(560px, calc(100vw - 24px))",
        opacity: "0",
        padding: "8px 12px",
        pointerEvents: "none",
        position: "fixed",
        textAlign: "center",
        top: "12px",
        transform: "translateX(-50%)",
        transition: "opacity 180ms ease",
        zIndex: "2147483647",
      });
      parent.append(element);

      requestAnimationFrame(() => {
        element.style.opacity = "1";
      });
      setTimeout(() => {
        element.style.opacity = "0";
        setTimeout(() => element.remove(), 220);
      }, 3600);
    };

    mount();
  };

  const initialize = (environment) => {
    if (consumeMarker(environment)) {
      show(environment);
    }
  };

  return { consumeMarker, initialize, marker, message, show, withMarker };
});
