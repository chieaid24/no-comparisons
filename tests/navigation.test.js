const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const readScript = (name) =>
  fs.readFileSync(path.join(__dirname, "..", name), "utf8");

const sources = {
  config: readScript("config.js"),
  github: readScript("github.js"),
  linkedin: readScript("linkedin.js"),
  routing: readScript("routing.js"),
};

const createBrowser = ({ href, profileType = null, profileUsername = null }) => {
  const state = { href, profileType, profileUsername };
  const redirects = [];
  const microtasks = [];
  const documentEvents = new Map();
  const windowEvents = new Map();
  let mutationCallback;

  const addEvent = (events, name, callback) => {
    const callbacks = events.get(name) ?? [];
    callbacks.push(callback);
    events.set(name, callbacks);
  };

  const document = {
    addEventListener(name, callback) {
      addEvent(documentEvents, name, callback);
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

  class MutationObserver {
    constructor(callback) {
      mutationCallback = callback;
    }

    observe() {}
  }

  const context = vm.createContext({
    URL,
    document,
    location,
    MutationObserver,
    queueMicrotask(callback) {
      microtasks.push(callback);
    },
    window,
  });

  const flushMicrotasks = () => {
    while (microtasks.length > 0) {
      microtasks.shift()();
    }
  };

  return {
    dispatchDocument(name) {
      for (const callback of documentEvents.get(name) ?? []) {
        callback();
      }
      flushMicrotasks();
    },
    dispatchWindow(name) {
      for (const callback of windowEvents.get(name) ?? []) {
        callback();
      }
      flushMicrotasks();
    },
    flushMicrotasks,
    redirects,
    run(...scripts) {
      for (const script of scripts) {
        vm.runInContext(sources[script], context);
      }
      flushMicrotasks();
    },
    setPage(next) {
      Object.assign(state, next);
    },
    triggerMutation() {
      mutationCallback();
      flushMicrotasks();
    },
  };
};

test("redirects confirmed GitHub user profiles on direct loads and refreshes", () => {
  for (let load = 0; load < 2; load += 1) {
    const browser = createBrowser({
      href: "https://github.com/octocat?tab=repositories",
      profileType: "user",
      profileUsername: "octocat",
    });

    browser.run("config", "routing", "github");
    assert.deepEqual(browser.redirects, ["https://github.com/chieaid24"]);
  }
});

test("does not redirect the owner, organizations, or repositories", () => {
  for (const page of [
    {
      href: "https://github.com/chieaid24",
      profileType: "user",
      profileUsername: "chieaid24",
    },
    {
      href: "https://github.com/openai",
      profileType: "organization",
      profileUsername: "openai",
    },
    {
      href: "https://github.com/octocat/hello-world",
      profileType: "user",
      profileUsername: "octocat",
    },
  ]) {
    const browser = createBrowser(page);
    browser.run("config", "routing", "github");
    assert.deepEqual(browser.redirects, []);
  }
});

test("handles GitHub SPA navigation", () => {
  const browser = createBrowser({
    href: "https://github.com/chieaid24",
    profileType: "user",
    profileUsername: "chieaid24",
  });
  browser.run("config", "routing", "github");

  browser.setPage({
    href: "https://github.com/octocat",
    profileType: "user",
    profileUsername: "octocat",
  });
  browser.dispatchDocument("turbo:load");

  assert.deepEqual(browser.redirects, ["https://github.com/chieaid24"]);
});

test("handles GitHub browser history navigation", () => {
  const browser = createBrowser({
    href: "https://github.com/chieaid24",
    profileType: "user",
    profileUsername: "chieaid24",
  });
  browser.run("config", "routing", "github");

  browser.setPage({
    href: "https://github.com/octocat?tab=followers",
    profileType: "user",
    profileUsername: "octocat",
  });
  browser.dispatchWindow("popstate");

  assert.deepEqual(browser.redirects, ["https://github.com/chieaid24"]);
});

test("redirects LinkedIn feed and other profiles on direct loads", () => {
  for (const href of [
    "https://www.linkedin.com/feed/?trk=nav_back_to_linkedin",
    "https://www.linkedin.com/in/someone/details/education/",
  ]) {
    const browser = createBrowser({ href });
    browser.run("config", "routing", "linkedin");
    assert.deepEqual(browser.redirects, [
      "https://www.linkedin.com/in/aidanchien/",
    ]);
  }
});

test("allows the owner and LinkedIn application pages without redirect loops", () => {
  for (const href of [
    "https://www.linkedin.com/in/aidanchien/",
    "https://www.linkedin.com/in/aidanchien/details/experience/",
    "https://www.linkedin.com/jobs/",
    "https://www.linkedin.com/messaging/",
  ]) {
    const browser = createBrowser({ href });
    browser.run("config", "routing", "linkedin");
    browser.triggerMutation();
    assert.deepEqual(browser.redirects, []);
  }
});

test("handles LinkedIn SPA and browser history navigation", () => {
  const browser = createBrowser({ href: "https://www.linkedin.com/jobs/" });
  browser.run("config", "routing", "linkedin");

  browser.setPage({ href: "https://www.linkedin.com/in/someone/" });
  browser.triggerMutation();

  assert.deepEqual(browser.redirects, [
    "https://www.linkedin.com/in/aidanchien/",
  ]);
});

test("checks allowed routes after browser back and forward navigation", () => {
  const browser = createBrowser({ href: "https://www.linkedin.com/jobs/" });
  browser.run("config", "routing", "linkedin");

  browser.setPage({ href: "https://www.linkedin.com/messaging/" });
  browser.dispatchWindow("popstate");

  assert.deepEqual(browser.redirects, []);
});
