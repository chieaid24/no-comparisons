(() => {
  const selectors = [
    ".js-yearly-contributions",
    "#js-contribution-activity",
  ];

  const hideContributions = () => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);

      if (element) {
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
