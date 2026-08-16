(() => {
  const selectors = [
    ".js-yearly-contributions",
    "#js-contribution-activity",
    ".js-profile-timeline-year-list",
  ];

  const hideContributions = () => {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        element.hidden = true;
      }
    }
  };

  hideContributions();
  new MutationObserver(hideContributions).observe(document, {
    childList: true,
    subtree: true,
  });
})();
