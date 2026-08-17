const assert = require("node:assert/strict");
const test = require("node:test");

require("../dom.js");
const githubDom = require("../content.js");
const linkedinDom = require("../linkedin-dom.js");
const { defaults } = require("../settings.js");

const makeElement = ({ href = "", closest = null } = {}) => {
  const classes = new Set();
  return {
    _closest: closest,
    classList: {
      add(name) {
        classes.add(name);
      },
      contains(name) {
        return classes.has(name);
      },
      remove(name) {
        classes.delete(name);
      },
    },
    closest() {
      return closest;
    },
    dataset: {},
    href,
  };
};

const makeDocument = (selectors) => {
  const elements = new Set([...selectors.values()].flat());
  for (const element of [...elements]) {
    if (element._closest) {
      elements.add(element._closest);
    }
  }
  return {
    getElementById() {
      return {};
    },
    querySelectorAll(selector) {
      if (selector.startsWith("[data-no-comparisons-feature=")) {
        const feature = selector.match(/"(.+)"/)[1];
        return [...elements].filter(
          (element) => element.dataset.noComparisonsFeature === feature,
        );
      }
      return selectors.get(selector) ?? [];
    },
  };
};

test("GitHub contribution hiding follows its setting and restores UI", () => {
  const graph = makeElement();
  const activity = makeElement();
  const years = makeElement();
  const document = makeDocument(
    new Map([
      [".js-yearly-contributions", [graph]],
      ["#js-contribution-activity", [activity]],
      [".js-profile-timeline-year-list", [years]],
    ]),
  );

  githubDom.apply(document, "chieaid24", defaults);
  for (const element of [graph, activity, years]) {
    assert.equal(element.classList.contains("no-comparisons-hidden"), true);
  }

  githubDom.apply(document, "chieaid24", {
    ...defaults,
    hideGitHubContributions: false,
  });
  for (const element of [graph, activity, years]) {
    assert.equal(element.classList.contains("no-comparisons-hidden"), false);
  }
});

test("GitHub hides only the owner's Overview entry", () => {
  const ownMenuItem = makeElement();
  const ownOverview = makeElement({
    href: "https://github.com/chieaid24",
    closest: ownMenuItem,
  });
  const otherOverview = makeElement({ href: "https://github.com/octocat" });
  const document = makeDocument(
    new Map([
      [
        'a[data-tab-item="overview"], li[data-menu-item="overview"] a[href]',
        [ownOverview, otherOverview],
      ],
    ]),
  );

  githubDom.apply(document, "chieaid24", defaults);
  assert.equal(ownMenuItem.classList.contains("no-comparisons-hidden"), true);
  assert.equal(otherOverview.classList.contains("no-comparisons-hidden"), false);

  githubDom.apply(document, "chieaid24", {
    ...defaults,
    blockGitHubOverview: false,
  });
  assert.equal(ownMenuItem.classList.contains("no-comparisons-hidden"), false);
});

test("GitHub hides only the owner's Followers links and always leaves Following", () => {
  const ownFollowers = makeElement({
    href: "https://github.com/chieaid24?tab=followers",
  });
  const otherFollowers = makeElement({
    href: "https://github.com/octocat?tab=followers",
  });
  const ownFollowing = makeElement({
    href: "https://github.com/chieaid24?tab=following",
  });
  const document = makeDocument(
    new Map([
      ['a[href*="tab=followers"]', [ownFollowers, otherFollowers]],
      ['a[href*="tab=following"]', [ownFollowing]],
    ]),
  );

  githubDom.apply(document, "chieaid24", defaults);
  assert.equal(ownFollowers.classList.contains("no-comparisons-hidden"), true);
  assert.equal(otherFollowers.classList.contains("no-comparisons-hidden"), false);
  assert.equal(ownFollowing.classList.contains("no-comparisons-hidden"), false);

  githubDom.apply(document, "chieaid24", {
    ...defaults,
    blockGitHubFollowers: false,
  });
  assert.equal(ownFollowers.classList.contains("no-comparisons-hidden"), false);
});

test("LinkedIn hides only its Home navigation entry and restores it", () => {
  const homeItem = makeElement();
  const home = makeElement({
    href: "https://www.linkedin.com/feed/",
    closest: homeItem,
  });
  const jobs = makeElement({ href: "https://www.linkedin.com/jobs/" });
  const profile = makeElement({
    href: "https://www.linkedin.com/in/someone/",
  });
  const document = makeDocument(
    new Map([
      [
        'nav a[href], a[data-test-global-nav-link="feed"]',
        [home, jobs, profile],
      ],
    ]),
  );

  linkedinDom.apply(document, defaults);
  assert.equal(homeItem.classList.contains("no-comparisons-hidden"), true);
  assert.equal(jobs.classList.contains("no-comparisons-hidden"), false);
  assert.equal(profile.classList.contains("no-comparisons-hidden"), false);

  linkedinDom.apply(document, {
    ...defaults,
    blockLinkedInFeed: false,
  });
  assert.equal(homeItem.classList.contains("no-comparisons-hidden"), false);
});

test("GitHub masks the commit count but keeps the button and restores it", () => {
  const label = { children: [], dataset: {}, textContent: "1,465,160 Commits" };
  const link = {
    href: "https://github.com/torvalds/linux/commits/master/",
    querySelectorAll: (selector) => (selector === "*" ? [label] : []),
  };
  const document = {
    getElementById: () => ({}),
    querySelectorAll(selector) {
      if (selector === 'a[href*="/commits/"]') {
        return [link];
      }

      if (selector.startsWith("[data-no-comparisons-feature=")) {
        const feature = selector.match(/"(.+)"/)[1];
        return [label].filter(
          (element) => element.dataset.noComparisonsFeature === feature,
        );
      }

      return [];
    },
  };

  githubDom.apply(document, "chieaid24", defaults);
  assert.equal(label.textContent, "Commits");
  assert.equal(label.dataset.noComparisonsCommitCount, "1,465,160 Commits");

  githubDom.apply(document, "chieaid24", defaults);
  assert.equal(label.textContent, "Commits");

  githubDom.apply(document, "chieaid24", {
    ...defaults,
    hideGitHubCommitCount: false,
  });
  assert.equal(label.textContent, "1,465,160 Commits");
  assert.equal(label.dataset.noComparisonsFeature, undefined);
});

test("GitHub leaves non-repo commit links untouched", () => {
  const label = { children: [], dataset: {}, textContent: "1,234 Commits" };
  const link = {
    href: "https://github.com/some/feed/commits-digest/commits/",
    querySelectorAll: (selector) => (selector === "*" ? [label] : []),
  };
  const document = {
    getElementById: () => ({}),
    querySelectorAll(selector) {
      if (selector === 'a[href*="/commits/"]') {
        return [link];
      }

      return [];
    },
  };

  githubDom.apply(document, "chieaid24", defaults);
  assert.equal(label.textContent, "1,234 Commits");
  assert.equal(label.dataset.noComparisonsFeature, undefined);
});
