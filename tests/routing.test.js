const assert = require("node:assert/strict");
const test = require("node:test");

const {
  classifyGitHubUrl,
  classifyLinkedInUrl,
  getGitHubProfile,
  getGitHubRedirect,
  getLinkedInRedirect,
} = require("../routing.js");
const { defaults } = require("../settings.js");

const ownGitHubUsername = "chieaid24";
const ownLinkedInSlug = "aidanchien";

test("classifies the owner's GitHub Overview and Followers separately", () => {
  for (const url of [
    "https://github.com/chieaid24",
    "https://github.com/chieaid24/",
    "https://github.com/chieaid24?tab=overview",
  ]) {
    assert.equal(
      classifyGitHubUrl(url, ownGitHubUsername).kind,
      "own-overview",
      url,
    );
  }

  assert.equal(
    classifyGitHubUrl(
      "https://github.com/chieaid24?tab=followers",
      ownGitHubUsername,
    ).kind,
    "own-followers",
  );
});

test("allows the owner's repositories, stars, and Following", () => {
  for (const url of [
    "https://github.com/chieaid24?tab=repositories",
    "https://github.com/chieaid24?tab=stars",
    "https://github.com/chieaid24?tab=following",
    "https://github.com/chieaid24/no-comparisons",
  ]) {
    assert.equal(getGitHubRedirect(url, ownGitHubUsername, null, defaults), null);
  }
});

test("redirects the owner's Overview and Followers independently", () => {
  const safeUrl = "https://github.com/chieaid24?tab=repositories";
  const overview = "https://github.com/chieaid24";
  const followers = "https://github.com/chieaid24?tab=followers";

  assert.equal(
    getGitHubRedirect(overview, ownGitHubUsername, null, defaults),
    safeUrl,
  );
  assert.equal(
    getGitHubRedirect(followers, ownGitHubUsername, null, defaults),
    safeUrl,
  );
  assert.equal(
    getGitHubRedirect(overview, ownGitHubUsername, null, {
      ...defaults,
      blockGitHubOverview: false,
    }),
    null,
  );
  assert.equal(
    getGitHubRedirect(followers, ownGitHubUsername, null, {
      ...defaults,
      blockGitHubFollowers: false,
    }),
    null,
  );
});

test("identifies another single-segment GitHub path as a profile candidate", () => {
  for (const url of [
    "https://github.com/octocat",
    "https://github.com/octocat/",
    "https://github.com/octocat?tab=repositories",
    "https://github.com/octocat?tab=stars",
    "https://github.com/octocat?tab=followers",
    "https://github.com/octocat?tab=following",
  ]) {
    assert.deepEqual(classifyGitHubUrl(url, ownGitHubUsername), {
      kind: "profile-candidate",
      username: "octocat",
    });
  }
});

test("allows GitHub repositories and system routes", () => {
  for (const url of [
    "https://github.com/octocat/hello-world",
    "https://github.com/openai/openai-node",
    "https://github.com/issues",
    "https://github.com/pulls",
    "https://github.com/notifications",
    "https://github.com/settings",
    "https://github.com/settings/profile",
    "https://github.com/explore",
    "https://github.com/marketplace",
  ]) {
    assert.equal(classifyGitHubUrl(url, ownGitHubUsername).kind, "allow", url);
    assert.equal(getGitHubRedirect(url, ownGitHubUsername, null, defaults), null);
  }
});

test("reads GitHub user and organization identity from matching page metadata", () => {
  const makeDocument = (type) => ({
    querySelector(selector) {
      if (selector === 'meta[property="profile:username"]') {
        return { getAttribute: () => "octocat" };
      }
      if (selector.includes(`schema.org/${type}`)) {
        return {
          querySelector() {
            return { textContent: " octocat " };
          },
        };
      }
      return null;
    },
  });

  assert.deepEqual(getGitHubProfile(makeDocument("Person")), {
    type: "user",
    username: "octocat",
  });
  assert.deepEqual(getGitHubProfile(makeDocument("Organization")), {
    type: "organization",
    username: "octocat",
  });
});

test("redirects only confirmed other GitHub users when enabled", () => {
  const url = "https://github.com/octocat?tab=followers";
  const user = { type: "user", username: "octocat" };

  assert.equal(
    getGitHubRedirect(url, ownGitHubUsername, user, defaults),
    "https://github.com/chieaid24?tab=repositories",
  );
  assert.equal(
    getGitHubRedirect(
      url,
      ownGitHubUsername,
      user,
      { ...defaults, blockGitHubProfiles: false },
    ),
    null,
  );
  assert.equal(
    getGitHubRedirect(url, ownGitHubUsername, {
      type: "organization",
      username: "octocat",
    }, defaults),
    null,
  );
  assert.equal(
    getGitHubRedirect(url, ownGitHubUsername, {
      type: "user",
      username: "stale-profile",
    }, defaults),
    null,
  );
});

test("ignores transient GitHub metadata during client-side navigation", () => {
  const document = {
    querySelector(selector) {
      if (selector === 'meta[property="profile:username"]') {
        return { getAttribute: () => "new-profile" };
      }
      if (selector.includes("schema.org/Person")) {
        return {
          querySelector: () => ({ textContent: "old-profile" }),
        };
      }
      return null;
    },
  };

  assert.equal(getGitHubProfile(document), null);
});

test("classifies LinkedIn feed, owner, other profiles, and application pages", () => {
  for (const url of [
    "https://www.linkedin.com/",
    "https://linkedin.com/?trk=homepage",
    "https://www.linkedin.com/feed/",
    "https://www.linkedin.com/feed/?doFeedRefresh=true",
    "https://www.linkedin.com/feed/update/urn:li:activity:123",
  ]) {
    assert.equal(classifyLinkedInUrl(url, ownLinkedInSlug).kind, "feed", url);
  }

  for (const url of [
    "https://www.linkedin.com/in/aidanchien/",
    "https://www.linkedin.com/in/aidanchien/details/experience/",
  ]) {
    assert.equal(
      classifyLinkedInUrl(url, ownLinkedInSlug).kind,
      "own-profile",
      url,
    );
  }

  for (const url of [
    "https://www.linkedin.com/in/someone/",
    "https://www.linkedin.com/in/someone/details/experience/",
    "https://www.linkedin.com/in/someone/details/education/",
    "https://www.linkedin.com/in/someone/recent-activity/",
  ]) {
    assert.equal(
      classifyLinkedInUrl(url, ownLinkedInSlug).kind,
      "other-profile",
      url,
    );
  }

  for (const url of [
    "https://www.linkedin.com/jobs/",
    "https://www.linkedin.com/messaging/",
    "https://www.linkedin.com/notifications/",
    "https://www.linkedin.com/settings/",
    "https://www.linkedin.com/company/openai/",
  ]) {
    assert.equal(classifyLinkedInUrl(url, ownLinkedInSlug).kind, "allow", url);
  }
});

test("redirects LinkedIn feed and profiles independently", () => {
  const safeUrl = "https://www.linkedin.com/in/aidanchien/";
  const feed = "https://www.linkedin.com/feed/";
  const profile = "https://www.linkedin.com/in/someone/";

  assert.equal(getLinkedInRedirect(feed, ownLinkedInSlug, defaults), safeUrl);
  assert.equal(getLinkedInRedirect(profile, ownLinkedInSlug, defaults), safeUrl);
  assert.equal(
    getLinkedInRedirect(feed, ownLinkedInSlug, {
      ...defaults,
      blockLinkedInFeed: false,
    }),
    null,
  );
  assert.equal(
    getLinkedInRedirect(profile, ownLinkedInSlug, {
      ...defaults,
      blockLinkedInProfiles: false,
    }),
    null,
  );
});

test("allows malformed and unrelated URLs", () => {
  assert.equal(classifyGitHubUrl("not a url", ownGitHubUsername).kind, "allow");
  assert.equal(
    classifyLinkedInUrl("https://example.com/feed/", ownLinkedInSlug).kind,
    "allow",
  );
});
