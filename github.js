(() => {
  const { githubUsername } = globalThis.noContributionsConfig;
  const routing = globalThis.noContributionsRouting;
  const ownProfileUrl = `https://github.com/${githubUsername}`;
  let pending = false;
  let redirecting = false;

  const checkRoute = () => {
    pending = false;
    if (redirecting) {
      return;
    }

    const profile = routing.getGitHubProfile(document);
    if (routing.shouldRedirectGitHub(location.href, githubUsername, profile)) {
      redirecting = true;
      location.replace(ownProfileUrl);
    }
  };

  const scheduleCheck = () => {
    if (pending) {
      return;
    }

    pending = true;
    queueMicrotask(checkRoute);
  };

  scheduleCheck();
  new MutationObserver(scheduleCheck).observe(document, {
    childList: true,
    subtree: true,
  });

  for (const eventName of ["turbo:load", "turbo:render", "pjax:end"]) {
    document.addEventListener(eventName, scheduleCheck, true);
  }

  for (const eventName of ["pageshow", "popstate"]) {
    window.addEventListener(eventName, scheduleCheck, true);
  }
})();
