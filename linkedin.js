(() => {
  const { linkedinProfileSlug } = globalThis.noContributionsConfig;
  const routing = globalThis.noContributionsRouting;
  const ownProfileUrl = `https://www.linkedin.com/in/${linkedinProfileSlug}/`;
  let redirecting = false;

  const checkRoute = () => {
    if (redirecting) {
      return;
    }

    const route = routing.classifyLinkedInUrl(
      location.href,
      linkedinProfileSlug,
    );
    if (route.kind === "feed" || route.kind === "other-profile") {
      redirecting = true;
      location.replace(ownProfileUrl);
    }
  };

  checkRoute();
  new MutationObserver(checkRoute).observe(document, {
    childList: true,
    subtree: true,
  });

  for (const eventName of ["pageshow", "popstate"]) {
    window.addEventListener(eventName, checkRoute, true);
  }
})();
