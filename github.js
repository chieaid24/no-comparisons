(() => {
  const { githubUsername } = globalThis.noComparisonsConfig;
  const settingsApi = globalThis.noComparisonsSettings;
  const routing = globalThis.noComparisonsRouting;
  const toast = globalThis.noComparisonsToast;
  const githubDom = globalThis.noComparisonsGitHubDom;
  let currentSettings;
  let settingsChanges = {};
  let pending = false;
  let redirecting = false;

  const run = () => {
    pending = false;
    if (!currentSettings) {
      return;
    }

    githubDom.apply(document, githubUsername, currentSettings);
    if (redirecting) {
      return;
    }

    const profile = routing.getGitHubProfile(document);
    const destination = routing.getGitHubRedirect(
      location.href,
      githubUsername,
      profile,
      currentSettings,
    );
    if (destination) {
      redirecting = true;
      const fromOtherProfile =
        routing.classifyGitHubUrl(location.href, githubUsername).kind ===
        "profile-candidate";
      location.replace(
        fromOtherProfile ? toast.withMarker(destination) : destination,
      );
    }
  };

  const schedule = () => {
    if (pending) {
      return;
    }

    pending = true;
    queueMicrotask(run);
  };

  new MutationObserver(schedule).observe(document, {
    childList: true,
    subtree: true,
  });

  for (const eventName of ["turbo:load", "turbo:render", "pjax:end"]) {
    document.addEventListener(eventName, schedule, true);
  }

  for (const eventName of ["pageshow", "popstate"]) {
    window.addEventListener(eventName, schedule, true);
  }

  settingsApi.onChanged((changes) => {
    settingsChanges = { ...settingsChanges, ...changes };
    currentSettings = {
      ...settingsApi.defaults,
      ...currentSettings,
      ...changes,
    };
    schedule();
  });
  settingsApi.load().then((settings) => {
    currentSettings = { ...settings, ...settingsChanges };
    settingsChanges = {};
    schedule();
  });
})();
