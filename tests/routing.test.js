const assert = require("node:assert/strict");
const test = require("node:test");

const {
  classifyGitHubUrl,
  classifyLinkedInUrl,
  getGitHubProfile,
  shouldRedirectGitHub,
} = require("../routing.js");

const ownGitHubUsername = "chieaid24";
const ownLinkedInSlug = "aidanchien";

test("allows the configured GitHub profile and query tabs", () => {
  for (const url of [
    "https://github.com/chieaid24",
    "https://github.com/chieaid24/",
    "https://github.com/chieaid24?tab=repositories",
  ]) {
    assert.equal(classifyGitHubUrl(url, ownGitHubUsername).kind, "own-profile");
  }
});

test("identifies another single-segment GitHub path as a profile candidate", () => {
  for (const url of [
    "https://github.com/octocat",
    "https://github.com/octocat/",
    "https://github.com/octocat?tab=repositories",
    "https://github.com/octocat?tab=followers",
  ]) {
    assert.deepEqual(classifyGitHubUrl(url, ownGitHubUsername), {
      kind: "profile-candidate",
      username: "octocat",
    });
  }
});

test("allows GitHub repositories and common system routes", () => {
  for (const url of [
    "https://github.com/octocat/hello-world",
    "https://github.com/openai/openai-node",
    "https://github.com/issues",
    "https://github.com/pulls",
    "https://github.com/notifications",
    "https://github.com/settings/profile",
    "https://github.com/search?q=browser",
    "https://github.com/marketplace",
  ]) {
    assert.equal(classifyGitHubUrl(url, ownGitHubUsername).kind, "allow", url);
  }
});

test("reads GitHub user and organization identity from page metadata", () => {
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

test("redirects only a confirmed matching GitHub user profile", () => {
  const url = "https://github.com/octocat?tab=followers";

  assert.equal(
    shouldRedirectGitHub(url, ownGitHubUsername, {
      type: "user",
      username: "octocat",
    }),
    true,
  );
  assert.equal(
    shouldRedirectGitHub(url, ownGitHubUsername, {
      type: "organization",
      username: "octocat",
    }),
    false,
  );
  assert.equal(
    shouldRedirectGitHub(url, ownGitHubUsername, {
      type: "user",
      username: "stale-profile",
    }),
    false,
  );
  assert.equal(
    shouldRedirectGitHub("https://github.com/chieaid24", ownGitHubUsername, {
      type: "user",
      username: "chieaid24",
    }),
    false,
  );
});

test("blocks the LinkedIn home page and feed variants", () => {
  for (const url of [
    "https://www.linkedin.com/",
    "https://linkedin.com/?trk=homepage",
    "https://www.linkedin.com/feed/",
    "https://www.linkedin.com/feed/?doFeedRefresh=true",
    "https://www.linkedin.com/feed/update/urn:li:activity:123",
  ]) {
    assert.equal(classifyLinkedInUrl(url, ownLinkedInSlug).kind, "feed", url);
  }
});

test("allows the configured LinkedIn profile and its subpages", () => {
  for (const url of [
    "https://www.linkedin.com/in/aidanchien/",
    "https://www.linkedin.com/in/aidanchien/details/experience/",
    "https://www.linkedin.com/in/AidanChien/recent-activity/",
  ]) {
    assert.equal(
      classifyLinkedInUrl(url, ownLinkedInSlug).kind,
      "own-profile",
      url,
    );
  }
});

test("blocks another LinkedIn profile and its subpages", () => {
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
});

test("allows unrelated LinkedIn functionality", () => {
  for (const url of [
    "https://www.linkedin.com/jobs/",
    "https://www.linkedin.com/messaging/",
    "https://www.linkedin.com/notifications/",
    "https://www.linkedin.com/mypreferences/",
    "https://www.linkedin.com/company/openai/",
  ]) {
    assert.equal(classifyLinkedInUrl(url, ownLinkedInSlug).kind, "allow", url);
  }
});

test("allows malformed and unrelated URLs", () => {
  assert.equal(classifyGitHubUrl("not a url", ownGitHubUsername).kind, "allow");
  assert.equal(
    classifyLinkedInUrl("https://example.com/feed/", ownLinkedInSlug).kind,
    "allow",
  );
});
