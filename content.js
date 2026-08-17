((root, factory) => {
  const githubDom = factory(root.noComparisonsDom);

  if (typeof module === "object" && module.exports) {
    module.exports = githubDom;
  }

  root.noComparisonsGitHubDom = githubDom;
})(globalThis, (dom) => {
  const contributionSelectors = [
    ".js-yearly-contributions",
    "#js-contribution-activity",
    ".js-profile-timeline-year-list",
  ];

  const getOverviewEntries = (document, ownUsername) => {
    const entries = [];
    for (const link of document.querySelectorAll(
      'a[data-tab-item="overview"], li[data-menu-item="overview"] a[href]',
    )) {
      const url = new URL(link.href, "https://github.com");
      const tab = url.searchParams.get("tab");
      if (
        url.hostname === "github.com" &&
        url.pathname.toLowerCase() === `/${ownUsername.toLowerCase()}` &&
        (!tab || tab.toLowerCase() === "overview")
      ) {
        entries.push(link.closest('li[data-menu-item="overview"]') || link);
      }
    }
    return entries;
  };

  const getFollowerEntries = (document, ownUsername) => {
    const entries = [];
    for (const link of document.querySelectorAll('a[href*="tab=followers"]')) {
      const url = new URL(link.href, "https://github.com");
      if (
        url.hostname === "github.com" &&
        url.pathname.toLowerCase() === `/${ownUsername.toLowerCase()}` &&
        url.searchParams.get("tab")?.toLowerCase() === "followers"
      ) {
        entries.push(link);
      }
    }
    return entries;
  };

  const apply = (document, ownUsername, settings) => {
    const contributions = contributionSelectors.flatMap((selector) =>
      [...document.querySelectorAll(selector)],
    );
    dom.sync(
      document,
      "github-contributions",
      settings.hideGitHubContributions,
      contributions,
    );
    dom.sync(
      document,
      "github-overview",
      settings.blockGitHubOverview,
      getOverviewEntries(document, ownUsername),
    );
    dom.sync(
      document,
      "github-followers",
      settings.blockGitHubFollowers,
      getFollowerEntries(document, ownUsername),
    );
  };

  return { apply, getFollowerEntries, getOverviewEntries };
});
