((root, factory) => {
  const linkedinDom = factory(root.noComparisonsDom);

  if (typeof module === "object" && module.exports) {
    module.exports = linkedinDom;
  }

  root.noComparisonsLinkedInDom = linkedinDom;
})(globalThis, (dom) => {
  const getHomeEntries = (document) => {
    const entries = [];
    for (const link of document.querySelectorAll(
      'nav a[href], a[data-test-global-nav-link="feed"]',
    )) {
      const url = new URL(link.href, "https://www.linkedin.com");
      if (
        (url.hostname === "linkedin.com" ||
          url.hostname === "www.linkedin.com") &&
        /^\/feed\/?$/.test(url.pathname)
      ) {
        entries.push(link.closest("li") || link);
      }
    }
    return entries;
  };

  const apply = (document, settings) => {
    dom.sync(
      document,
      "linkedin-feed",
      settings.blockLinkedInFeed,
      getHomeEntries(document),
    );
  };

  return { apply, getHomeEntries };
});
