((root, factory) => {
  const dom = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = dom;
  }

  root.noComparisonsDom = dom;
})(globalThis, () => {
  const hiddenClass = "no-comparisons-hidden";
  const styleId = "no-comparisons-style";

  const ensureStyle = (document) => {
    if (document.getElementById(styleId)) {
      return true;
    }

    const parent = document.head || document.documentElement;
    if (!parent) {
      return false;
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `.${hiddenClass} { display: none !important; }`;
    parent.append(style);
    return true;
  };

  const clear = (document, feature) => {
    for (const element of document.querySelectorAll(
      `[data-no-comparisons-feature="${feature}"]`,
    )) {
      element.classList.remove(hiddenClass);
      delete element.dataset.noComparisonsFeature;
    }
  };

  const sync = (document, feature, enabled, elements) => {
    clear(document, feature);
    if (!enabled || !ensureStyle(document)) {
      return;
    }

    for (const element of new Set(elements.filter(Boolean))) {
      element.classList.add(hiddenClass);
      element.dataset.noComparisonsFeature = feature;
    }
  };

  return { clear, hiddenClass, sync };
});
