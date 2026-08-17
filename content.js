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

  const commitCountFeature = "github-commit-count";
  const commitLabelPattern = /^\s*[\d,]+\s+commits?\s*$/i;
  const commitNumberPattern = /[\d,]+\s+(commits?)/i;

  const isRepoCommitsHref = (href) => {
    const url = new URL(href, "https://github.com");
    if (url.hostname !== "github.com") {
      return false;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    return segments[2]?.toLowerCase() === "commits";
  };

  const getCommitCountLabels = (document) => {
    const labels = [];
    for (const link of document.querySelectorAll('a[href*="/commits/"]')) {
      if (!isRepoCommitsHref(link.href)) {
        continue;
      }

      for (const node of link.querySelectorAll("*")) {
        if (
          node.children.length === 0 &&
          commitLabelPattern.test(node.textContent)
        ) {
          labels.push(node);
        }
      }
    }
    return labels;
  };

  const maskCommitCounts = (document) => {
    for (const label of getCommitCountLabels(document)) {
      label.dataset.noComparisonsFeature = commitCountFeature;
      label.dataset.noComparisonsCommitCount = label.textContent;
      label.textContent = label.textContent.replace(commitNumberPattern, "$1");
    }
  };

  const restoreCommitCounts = (document) => {
    for (const label of document.querySelectorAll(
      `[data-no-comparisons-feature="${commitCountFeature}"]`,
    )) {
      const original = label.dataset.noComparisonsCommitCount;
      if (original != null) {
        label.textContent = original;
      }

      delete label.dataset.noComparisonsFeature;
      delete label.dataset.noComparisonsCommitCount;
    }
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

    if (settings.hideGitHubCommitCount) {
      maskCommitCounts(document);
    } else {
      restoreCommitCounts(document);
    }
  };

  return {
    apply,
    getCommitCountLabels,
    getFollowerEntries,
    getOverviewEntries,
  };
});
