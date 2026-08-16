const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "content.js"),
  "utf8",
);

const runContentScript = (elements) => {
  let observer;
  let observation;

  const document = {
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };

  class MutationObserver {
    constructor(callback) {
      observer = callback;
    }

    observe(target, options) {
      observation = { target, options };
    }
  }

  vm.runInNewContext(source, { document, MutationObserver });
  return { document, observer, observation };
};

test("hides the contribution graph and activity", () => {
  const graph = { hidden: false };
  const activity = { hidden: false };
  const { document, observation } = runContentScript(
    new Map([
      [".js-yearly-contributions", graph],
      ["#js-contribution-activity", activity],
    ]),
  );

  assert.equal(graph.hidden, true);
  assert.equal(activity.hidden, true);
  assert.equal(observation.target, document);
  assert.equal(observation.options.childList, true);
  assert.equal(observation.options.subtree, true);
});

test("does nothing when profile contribution elements are absent", () => {
  assert.doesNotThrow(() => runContentScript(new Map()));
});

test("hides contribution elements added during client-side navigation", () => {
  const elements = new Map();
  const { observer } = runContentScript(elements);
  const graph = { hidden: false };
  const activity = { hidden: false };

  elements.set(".js-yearly-contributions", graph);
  elements.set("#js-contribution-activity", activity);
  observer();

  assert.equal(graph.hidden, true);
  assert.equal(activity.hidden, true);
});
