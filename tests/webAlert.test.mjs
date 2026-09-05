import assert from "node:assert/strict";
import test from "node:test";
import { Alert } from "../lib/alert.web.ts";

// Small DOM double to exercise callback/queue behavior without a browser runner.
function installDocument() {
  class Element {
    children = [];
    style = {};
    attributes = {};
    constructor(tag) { this.tag = tag; }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    remove() { this.parent.children = this.parent.children.filter(node => node !== this); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  globalThis.document = { createElement: tag => new Element(tag), body: new Element("body"), activeElement: new Element("button") };
  return () => delete globalThis.document;
}
const dialog = () => document.body.children[0];
const buttons = () => dialog().children[2].children;
const escape = () => dialog().oncancel({ preventDefault() {} });

test("server rendering does not touch the DOM or queue an alert", () => {
  assert.doesNotThrow(() => Alert.alert("Server"));
});

test("destructive confirmation focuses Cancel, and Escape never runs the mutation", () => {
  const cleanup = installDocument();
  let deleted = 0;
  let cancelled = 0;
  Alert.alert("Delete community?", "Cannot be undone", [
    { text: "Delete", style: "destructive", onPress: () => deleted++ },
    { text: "Cancel", style: "cancel", onPress: () => cancelled++ },
  ]);
  assert.equal(document.activeElement.textContent, "Cancel");
  escape();
  assert.equal(deleted, 0);
  assert.equal(cancelled, 1);
  assert.equal(document.body.children.length, 0);
  cleanup();
});

test("three-button menus run only the chosen action, once, and restore focus", () => {
  const cleanup = installDocument();
  const originalFocus = document.activeElement;
  const calls = [];
  Alert.alert("Manage", "Choose an action", [
    { text: "Transfer", onPress: () => calls.push("transfer") },
    { text: "Delete", style: "destructive", onPress: () => calls.push("delete") },
    { text: "Cancel", style: "cancel" },
  ]);
  const transfer = buttons()[0];
  transfer.onclick();
  transfer.onclick();
  assert.deepEqual(calls, ["transfer"]);
  assert.equal(document.activeElement, originalFocus);
  cleanup();
});

test("queued and nested alerts remain visible in order", () => {
  const cleanup = installDocument();
  Alert.alert("First", "", [{ text: "Continue", onPress: () => Alert.alert("Nested") }]);
  Alert.alert("Second");
  assert.equal(document.body.children.length, 1);
  buttons()[0].onclick();
  assert.equal(dialog().children[0].textContent, "Second");
  buttons()[0].onclick();
  assert.equal(dialog().children[0].textContent, "Nested");
  buttons()[0].onclick();
  assert.equal(document.body.children.length, 0);
  cleanup();
});

test("non-cancelable destructive action cannot be accepted with Escape", () => {
  const cleanup = installDocument();
  let calls = 0;
  Alert.alert("Confirm", "", [{ text: "Delete", style: "destructive", onPress: () => calls++ }]);
  escape();
  assert.equal(calls, 0);
  assert.equal(dialog().open, true);
  buttons()[0].onclick();
  assert.equal(calls, 1);
  cleanup();
});

test("messages are literal text and cancelable dismissal calls onDismiss", () => {
  const cleanup = installDocument();
  let dismissed = 0;
  Alert.alert("<script>bad()</script>", "<b>text</b>", undefined, { cancelable: true, onDismiss: () => dismissed++ });
  assert.equal(dialog().children[0].textContent, "<script>bad()</script>");
  assert.equal(dialog().children[1].textContent, "<b>text</b>");
  escape();
  assert.equal(dismissed, 1);
  cleanup();
});
