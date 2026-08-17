((root, factory) => {
  const popup = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = popup;
  }

  root.noComparisonsPopup = popup;
  if (root.document) {
    popup.initialize(root.document, root.noComparisonsSettings);
  }
})(globalThis, () => {
  const initialize = async (document, settingsApi) => {
    const inputs = [...document.querySelectorAll("[data-setting]")];
    const settings = await settingsApi.load();

    for (const input of inputs) {
      input.checked = settings[input.dataset.setting];
      input.addEventListener("change", () => {
        settingsApi.update({ [input.dataset.setting]: input.checked });
      });
    }
  };

  return { initialize };
});
