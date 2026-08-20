((root, factory) => {
  const settings = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = settings;
  }

  root.noComparisonsSettings = settings;
})(globalThis, (root) => {
  const defaults = Object.freeze({
    hideGitHubContributions: true,
    hideGitHubCommitCount: true,
    blockGitHubHome: true,
    blockGitHubOverview: true,
    blockGitHubFollowers: true,
    blockGitHubProfiles: true,
    blockLinkedInFeed: true,
    blockLinkedInProfiles: true,
  });

  const load = () => root.chrome.storage.local.get(defaults);

  const update = (changes) => root.chrome.storage.local.set(changes);

  const onChanged = (callback) => {
    const listener = (changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      const settingsChanges = {};
      for (const key of Object.keys(defaults)) {
        if (typeof changes[key]?.newValue === "boolean") {
          settingsChanges[key] = changes[key].newValue;
        }
      }

      if (Object.keys(settingsChanges).length > 0) {
        callback(settingsChanges);
      }
    };

    root.chrome.storage.onChanged.addListener(listener);
    return () => root.chrome.storage.onChanged.removeListener(listener);
  };

  return { defaults, load, onChanged, update };
});
