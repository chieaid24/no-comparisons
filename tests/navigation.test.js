const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const readScript = (name) =>
  fs.readFileSync(path.join(__dirname, "..", name), "utf8");

const sources = Object.fromEntries(
  [
    "config",
    "settings",
    "routing",
    "toast",
    "dom",
    "content",
    "github",
    "linkedin-dom",
    "linkedin",
  ].map((name) => [name, readScript(`${name}.js`)]),
);

const defaultSettings = {
  hideGitHubContributions: true,
  blockGitHubOverview: true,
  blockGitHubFollowers: true,
  blockGitHubProfiles: true,
  blockLinkedInFeed: true,
  blockLinkedInProfiles: true,
};

const createBrowser = ({
  href,
  profileType = null,
  profileUsername = null,
  settings = {},
}) => {
  const state = {
    href,
    profileType,
    profileUsername,
    settings: { ...defaultSettings, ...settings },
  };
  const redirects = [];
  const microtasks = [];
  const documentEvents = new Map();
  const windowEvents = new Map();
  const storageListeners = new Set();
  const mutationCallbacks = [];
  const styles = new Map();

  const addEvent = (events, name, callback) => {
    const callbacks = events.get(name) ?? [];
    callbacks.push(callback);
    events.set(name, callbacks);
  };

  const document = {
    addEventListener(name, callback) {
      addEvent(documentEvents, name, callback);
    },
    createElement() {
      return { dataset: {}, style: {} };
    },
    documentElement: {
      append(element) {
        styles.set(element.id, element);
      },
    },
    getElementById(id) {
      return styles.get(id) ?? null;
    },
    head: {
      append(element) {
        styles.set(element.id, element);
      },
    },
    querySelector(selector) {
      if (selector === 'meta[property="profile:username"]') {
        return state.profileUsername
          ? { getAttribute: () => state.profileUsername }
          : null;
      }
      if (selector.includes("schema.org/Person")) {
        return state.profileType === "user"
          ? {
              querySelector() {
                return { textContent: state.profileUsername };
              },
            }
          : null;
      }
      if (selector.includes("schema.org/Organization")) {
        return state.profileType === "organization" ? {} : null;
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  const window = {
    addEventListener(name, callback) {
      addEvent(windowEvents, name, callback);
    },
  };

  const location = {
    get href() {
      return state.href;
    },
    replace(url) {
      redirects.push(url);
      state.href = url;
    },
  };

  const history = {
    state: null,
    replaceState(_state, _title, url) {
      state.href = url;
    },
  };

  class MutationObserver {
    constructor(callback) {
      mutationCallbacks.push(callback);
    }

    observe() {}
  }

  const chrome = {
    storage: {
      local: {
        async get(defaults) {
          return { ...defaults, ...state.settings };
        },
        async set(changes) {
          const events = {};
          for (const [key, value] of Object.entries(changes)) {
            events[key] = {
              oldValue: state.settings[key],
              newValue: value,
            };
            state.settings[key] = value;
          }
          for (const listener of storageListeners) {
            listener(events, "local");
          }
        },
      },
      onChanged: {
        addListener(listener) {
          storageListeners.add(listener);
        },
        removeListener(listener) {
          storageListeners.delete(listener);
        },
      },
    },
  };

  const context = vm.createContext({
    URL,
    chrome,
    document,
    history,
    location,
    MutationObserver,
    queueMicrotask(callback) {
      microtasks.push(callback);
    },
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout() {},
    window,
  });

  const flush = async () => {
    for (let index = 0; index < 4; index += 1) {
      await Promise.resolve();
      while (microtasks.length > 0) {
        microtasks.shift()();
      }
    }
  };

  return {
    async changeSetting(key, value) {
      await chrome.storage.local.set({ [key]: value });
      await flush();
    },
    async dispatchDocument(name) {
      for (const callback of documentEvents.get(name) ?? []) {
        callback();
      }
      await flush();
    },
    async dispatchWindow(name) {
      for (const callback of windowEvents.get(name) ?? []) {
        callback();
      }
      await flush();
    },
    redirects,
    async run(site) {
      const scripts = ["config", "settings", "routing", "toast", "dom"];
      if (site === "github") {
        scripts.push("content", "github");
      } else {
        scripts.push("linkedin-dom", "linkedin");
      }
      for (const script of scripts) {
        vm.runInContext(sources[script], context);
      }
      await flush();
    },
    setPage(next) {
      Object.assign(state, next);
    },
    async triggerMutation() {
      for (const callback of mutationCallbacks) {
        callback();
      }
      await flush();
    },
  };
};

const githubSafeUrl =
  "https://github.com/chieaid24?tab=repositories#no-comparisons-redirected";
const linkedinSafeUrl =
  "https://www.linkedin.com/in/aidanchien/#no-comparisons-redirected";

test("redirects the owner's GitHub Overview on direct load and refresh", async () => {
  for (let load = 0; load < 2; load += 1) {
    const browser = createBrowser({ href: "https://github.com/chieaid24" });
    await browser.run("github");
    assert.deepEqual(browser.redirects, [githubSafeUrl]);
  }
});

test("redirects the owner's Followers but always allows Following", async () => {
  const followers = createBrowser({
    href: "https://github.com/chieaid24?tab=followers",
  });
  await followers.run("github");
  assert.deepEqual(followers.redirects, [githubSafeUrl]);

  const following = createBrowser({
    href: "https://github.com/chieaid24?tab=following",
  });
  await following.run("github");
  assert.deepEqual(following.redirects, []);
});

test("GitHub owner restrictions disable independently", async () => {
  const overview = createBrowser({
    href: "https://github.com/chieaid24",
    settings: { blockGitHubOverview: false },
  });
  await overview.run("github");
  assert.deepEqual(overview.redirects, []);

  const followers = createBrowser({
    href: "https://github.com/chieaid24?tab=followers",
    settings: { blockGitHubFollowers: false },
  });
  await followers.run("github");
  assert.deepEqual(followers.redirects, []);
});

test("redirects confirmed other GitHub users and respects its toggle", async () => {
  const enabled = createBrowser({
    href: "https://github.com/octocat?tab=stars",
    profileType: "user",
    profileUsername: "octocat",
  });
  await enabled.run("github");
  assert.deepEqual(enabled.redirects, [githubSafeUrl]);

  const disabled = createBrowser({
    href: "https://github.com/octocat?tab=followers",
    profileType: "user",
    profileUsername: "octocat",
    settings: { blockGitHubProfiles: false },
  });
  await disabled.run("github");
  assert.deepEqual(disabled.redirects, []);
});

test("allows GitHub tabs, repositories, organizations, and system routes", async () => {
  for (const page of [
    { href: "https://github.com/chieaid24?tab=repositories" },
    { href: "https://github.com/chieaid24?tab=stars" },
    { href: "https://github.com/chieaid24/repo" },
    {
      href: "https://github.com/openai",
      profileType: "organization",
      profileUsername: "openai",
    },
    { href: "https://github.com/openai/openai-node" },
    { href: "https://github.com/issues" },
    { href: "https://github.com/settings" },
    { href: "https://github.com/notifications" },
  ]) {
    const browser = createBrowser(page);
    await browser.run("github");
    assert.deepEqual(browser.redirects, [], page.href);
  }
});

test("GitHub SPA and history navigation cannot bypass restrictions", async () => {
  for (const event of ["turbo:load", "popstate"]) {
    const browser = createBrowser({
      href: "https://github.com/chieaid24?tab=repositories",
    });
    await browser.run("github");
    browser.setPage({ href: "https://github.com/chieaid24?tab=followers" });
    if (event === "turbo:load") {
      await browser.dispatchDocument(event);
    } else {
      await browser.dispatchWindow(event);
    }
    assert.deepEqual(browser.redirects, [githubSafeUrl]);
  }
});

test("enabling a GitHub restriction applies immediately", async () => {
  const browser = createBrowser({
    href: "https://github.com/chieaid24",
    settings: { blockGitHubOverview: false },
  });
  await browser.run("github");
  await browser.changeSetting("blockGitHubOverview", true);
  assert.deepEqual(browser.redirects, [githubSafeUrl]);
});

test("redirects LinkedIn feed and other profiles independently", async () => {
  for (const href of [
    "https://www.linkedin.com/feed/?trk=nav_back_to_linkedin",
    "https://www.linkedin.com/in/someone/details/education/",
  ]) {
    const browser = createBrowser({ href });
    await browser.run("linkedin");
    assert.deepEqual(browser.redirects, [linkedinSafeUrl]);
  }

  const feedDisabled = createBrowser({
    href: "https://www.linkedin.com/feed/",
    settings: { blockLinkedInFeed: false },
  });
  await feedDisabled.run("linkedin");
  assert.deepEqual(feedDisabled.redirects, []);

  const profilesDisabled = createBrowser({
    href: "https://www.linkedin.com/in/someone/",
    settings: { blockLinkedInProfiles: false },
  });
  await profilesDisabled.run("linkedin");
  assert.deepEqual(profilesDisabled.redirects, []);
});

test("allows the LinkedIn owner and unrelated application pages", async () => {
  for (const href of [
    "https://www.linkedin.com/in/aidanchien/",
    "https://www.linkedin.com/in/aidanchien/details/experience/",
    "https://www.linkedin.com/jobs/",
    "https://www.linkedin.com/messaging/",
    "https://www.linkedin.com/notifications/",
    "https://www.linkedin.com/settings/",
  ]) {
    const browser = createBrowser({ href });
    await browser.run("linkedin");
    assert.deepEqual(browser.redirects, [], href);
  }
});

test("LinkedIn SPA and history navigation cannot bypass restrictions", async () => {
  for (const mode of ["mutation", "popstate"]) {
    const browser = createBrowser({
      href: "https://www.linkedin.com/jobs/",
    });
    await browser.run("linkedin");
    browser.setPage({ href: "https://www.linkedin.com/in/someone/" });
    if (mode === "mutation") {
      await browser.triggerMutation();
    } else {
      await browser.dispatchWindow("popstate");
    }
    assert.deepEqual(browser.redirects, [linkedinSafeUrl]);
  }
});

test("enabling a LinkedIn restriction applies immediately", async () => {
  const browser = createBrowser({
    href: "https://www.linkedin.com/feed/",
    settings: { blockLinkedInFeed: false },
  });
  await browser.run("linkedin");
  await browser.changeSetting("blockLinkedInFeed", true);
  assert.deepEqual(browser.redirects, [linkedinSafeUrl]);
});
