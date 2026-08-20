const assert = require("node:assert/strict");
const test = require("node:test");

const settingsApi = require("../settings.js");
const popup = require("../popup.js");
const toast = require("../toast.js");

const installStorage = (initial = {}) => {
  const listeners = new Set();
  const stored = { ...initial };
  global.chrome = {
    storage: {
      local: {
        async get(defaults) {
          return { ...defaults, ...stored };
        },
        async set(changes) {
          const events = {};
          for (const [key, value] of Object.entries(changes)) {
            events[key] = { oldValue: stored[key], newValue: value };
            stored[key] = value;
          }
          for (const listener of listeners) {
            listener(events, "local");
          }
        },
      },
      onChanged: {
        addListener(listener) {
          listeners.add(listener);
        },
        removeListener(listener) {
          listeners.delete(listener);
        },
      },
    },
  };
  return stored;
};

const makeInput = (setting) => {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    checked: false,
    dataset: { setting },
    dispatch(name) {
      return listeners.get(name)();
    },
  };
};

test("all eight settings default to enabled", async () => {
  installStorage();
  const settings = await settingsApi.load();

  assert.deepEqual(settings, settingsApi.defaults);
  assert.equal(Object.keys(settings).length, 8);
  assert.equal(Object.values(settings).every(Boolean), true);
});

test("settings persist independently and notify open content scripts", async () => {
  const stored = installStorage();
  const changes = [];
  const stop = settingsApi.onChanged((change) => changes.push(change));

  await settingsApi.update({ blockGitHubFollowers: false });
  assert.equal(stored.blockGitHubFollowers, false);
  assert.deepEqual(changes, [{ blockGitHubFollowers: false }]);
  assert.equal((await settingsApi.load()).blockGitHubOverview, true);

  stop();
  await settingsApi.update({ blockLinkedInFeed: false });
  assert.equal(changes.length, 1);
});

test("popup reflects persisted settings and stores each toggle", async () => {
  installStorage({ blockGitHubOverview: false });
  const overview = makeInput("blockGitHubOverview");
  const followingProfiles = makeInput("blockGitHubProfiles");
  const document = {
    querySelectorAll: () => [overview, followingProfiles],
  };

  await popup.initialize(document, settingsApi);
  assert.equal(overview.checked, false);
  assert.equal(followingProfiles.checked, true);

  followingProfiles.checked = false;
  await followingProfiles.dispatch("change");
  assert.equal((await settingsApi.load()).blockGitHubProfiles, false);
  assert.equal((await settingsApi.load()).blockGitHubOverview, false);

  const reopened = makeInput("blockGitHubProfiles");
  await popup.initialize({ querySelectorAll: () => [reopened] }, settingsApi);
  assert.equal(reopened.checked, false);
});

const makeToastEnvironment = (href) => {
  const elements = new Map();
  const timeouts = [];
  const appended = [];
  const location = { href };
  const parent = {
    append(element) {
      appended.push(element);
      elements.set(element.id, element);
    },
  };
  const document = {
    body: parent,
    createElement() {
      return {
        remove() {
          this.removed = true;
          elements.delete(this.id);
        },
        setAttribute(name, value) {
          this[name] = value;
        },
        style: {},
      };
    },
    documentElement: parent,
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };
  const history = {
    state: null,
    replaceState(_state, _title, url) {
      location.href = url;
    },
  };

  return {
    appended,
    document,
    history,
    location,
    requestAnimationFrame(callback) {
      callback();
    },
    setTimeout(callback, delay) {
      timeouts.push({ callback, delay });
    },
    timeouts,
  };
};

test("redirect marker is destination-local and preserves the safe query", () => {
  assert.equal(
    toast.withMarker("https://github.com/chieaid24?tab=repositories"),
    "https://github.com/chieaid24?tab=repositories#no-comparisons-redirected",
  );
  assert.equal(
    toast.withMarker("https://www.linkedin.com/in/aidanchien/"),
    "https://www.linkedin.com/in/aidanchien/#no-comparisons-redirected",
  );
});

test("toast appears once after redirect, clears state, and disappears", () => {
  const environment = makeToastEnvironment(
    "https://github.com/chieaid24?tab=repositories#no-comparisons-redirected",
  );

  toast.initialize(environment);
  assert.equal(
    environment.location.href,
    "https://github.com/chieaid24?tab=repositories",
  );
  assert.equal(environment.appended.length, 1);

  const element = environment.appended[0];
  assert.equal(element.textContent, toast.message);
  assert.equal(
    element.textContent,
    "Redirected. Let not your mind run on what you lack as much as on what you have already",
  );
  assert.equal(element.style.top, "12px");
  assert.equal(element.style.left, "50%");
  assert.equal(element.style.pointerEvents, "none");
  assert.equal(element.style.zIndex, "2147483647");
  assert.equal(element.style.opacity, "1");

  toast.initialize(environment);
  assert.equal(environment.appended.length, 1);

  assert.equal(environment.timeouts[0].delay, 3600);
  environment.timeouts[0].callback();
  assert.equal(element.style.opacity, "0");
  assert.equal(environment.timeouts[1].delay, 220);
  environment.timeouts[1].callback();
  assert.equal(element.removed, true);
});

test("normal navigation and refresh do not show a toast", () => {
  const environment = makeToastEnvironment(
    "https://www.linkedin.com/in/aidanchien/",
  );
  toast.initialize(environment);
  toast.initialize(environment);
  assert.equal(environment.appended.length, 0);
  assert.equal(environment.timeouts.length, 0);
});

test("sequential redirects replace the prior toast without stale state", () => {
  const environment = makeToastEnvironment(
    "https://github.com/chieaid24?tab=repositories#no-comparisons-redirected",
  );
  toast.initialize(environment);
  const first = environment.appended[0];

  environment.location.href =
    "https://github.com/chieaid24?tab=repositories#no-comparisons-redirected";
  toast.initialize(environment);

  assert.equal(first.removed, true);
  assert.equal(environment.appended.length, 2);
  assert.equal(
    environment.location.href,
    "https://github.com/chieaid24?tab=repositories",
  );
});
