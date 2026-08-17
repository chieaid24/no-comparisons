((root, factory) => {
  const routing = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = routing;
  }

  root.noComparisonsRouting = routing;
})(globalThis, () => {
  const githubSystemRoutes = new Set([
    "about",
    "account",
    "apps",
    "business",
    "codespaces",
    "collections",
    "contact",
    "copilot",
    "customer-stories",
    "dashboard",
    "discussions",
    "enterprise",
    "events",
    "explore",
    "features",
    "issues",
    "join",
    "login",
    "logout",
    "marketplace",
    "new",
    "notifications",
    "organizations",
    "orgs",
    "pricing",
    "pulls",
    "readme",
    "search",
    "security",
    "sessions",
    "settings",
    "site",
    "sponsors",
    "stars",
    "team",
    "topics",
    "trending",
  ]);

  const parseUrl = (value) => {
    try {
      return value instanceof URL ? value : new URL(value);
    } catch {
      return null;
    }
  };

  const pathSegments = (url) =>
    url.pathname.split("/").filter((segment) => segment.length > 0);

  const classifyGitHubUrl = (value, ownUsername) => {
    const url = parseUrl(value);
    if (!url || url.hostname.toLowerCase() !== "github.com") {
      return { kind: "allow" };
    }

    const segments = pathSegments(url);
    if (segments.length !== 1) {
      return { kind: "allow" };
    }

    const username = segments[0].toLowerCase();
    if (githubSystemRoutes.has(username)) {
      return { kind: "allow" };
    }

    if (username !== ownUsername.toLowerCase()) {
      return { kind: "profile-candidate", username };
    }

    const tab = url.searchParams.get("tab")?.toLowerCase();
    if (!tab || tab === "overview") {
      return { kind: "own-overview", username };
    }

    if (tab === "followers") {
      return { kind: "own-followers", username };
    }

    return { kind: "own-profile-tab", tab, username };
  };

  const getGitHubProfile = (document) => {
    const metadataUsername = document
      .querySelector('meta[property="profile:username"]')
      ?.getAttribute("content")
      ?.toLowerCase();

    if (!metadataUsername) {
      return null;
    }

    const person = document.querySelector(
      '[itemtype="http://schema.org/Person"], [itemtype="https://schema.org/Person"]',
    );
    const organization = document.querySelector(
      '[itemtype="http://schema.org/Organization"], [itemtype="https://schema.org/Organization"]',
    );

    if (organization) {
      return { type: "organization", username: metadataUsername };
    }

    const personUsername = person
      ?.querySelector('[itemprop="additionalName"]')
      ?.textContent?.trim()
      .toLowerCase();

    return personUsername === metadataUsername
      ? { type: "user", username: metadataUsername }
      : null;
  };

  const getGitHubRedirect = (value, ownUsername, profile, settings) => {
    const route = classifyGitHubUrl(value, ownUsername);
    const safeUrl = `https://github.com/${ownUsername}?tab=repositories`;

    if (route.kind === "own-overview" && settings.blockGitHubOverview) {
      return safeUrl;
    }

    if (route.kind === "own-followers" && settings.blockGitHubFollowers) {
      return safeUrl;
    }

    if (
      route.kind === "profile-candidate" &&
      settings.blockGitHubProfiles &&
      profile?.type === "user" &&
      profile.username === route.username
    ) {
      return safeUrl;
    }

    return null;
  };

  const classifyLinkedInUrl = (value, ownProfileSlug) => {
    const url = parseUrl(value);
    const hostname = url?.hostname.toLowerCase();
    if (!url || (hostname !== "linkedin.com" && hostname !== "www.linkedin.com")) {
      return { kind: "allow" };
    }

    const segments = pathSegments(url).map((segment) => segment.toLowerCase());
    if (segments.length === 0 || segments[0] === "feed") {
      return { kind: "feed" };
    }

    if (segments[0] !== "in" || segments.length < 2) {
      return { kind: "allow" };
    }

    const profileSlug = segments[1];
    if (profileSlug === ownProfileSlug.toLowerCase()) {
      return { kind: "own-profile", profileSlug };
    }

    return { kind: "other-profile", profileSlug };
  };

  const getLinkedInRedirect = (value, ownProfileSlug, settings) => {
    const route = classifyLinkedInUrl(value, ownProfileSlug);
    if (
      (route.kind === "feed" && settings.blockLinkedInFeed) ||
      (route.kind === "other-profile" && settings.blockLinkedInProfiles)
    ) {
      return `https://www.linkedin.com/in/${ownProfileSlug}/`;
    }

    return null;
  };

  return {
    classifyGitHubUrl,
    classifyLinkedInUrl,
    getGitHubProfile,
    getGitHubRedirect,
    getLinkedInRedirect,
  };
});
