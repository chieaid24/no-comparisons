(() => {
  const { linkedinProfileSlug } = globalThis.noComparisonsConfig;
  const settingsApi = globalThis.noComparisonsSettings;
  const routing = globalThis.noComparisonsRouting;
  const toast = globalThis.noComparisonsToast;
  const linkedinDom = globalThis.noComparisonsLinkedInDom;
  let currentSettings;
  let settingsChanges = {};
  let pending = false;
  let redirecting = false;

  const run = () => {
    pending = false;
    if (!currentSettings) {
      return;
    }

    linkedinDom.apply(document, currentSettings);
    if (redirecting) {
      return;
    }

    const destination = routing.getLinkedInRedirect(
      location.href,
      linkedinProfileSlug,
      currentSettings,
    );
    if (destination) {
      redirecting = true;
      location.replace(toast.withMarker(destination));
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
