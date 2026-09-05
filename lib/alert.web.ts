import type { AlertButton, AlertOptions } from "react-native";

type Request = { title: string; message?: string; buttons?: AlertButton[]; options?: AlertOptions };
const queue: Request[] = [];
let showing = false;

// RN Web's Alert is a no-op. A modal HTML dialog supports the existing named
// actions (including three-button menus), keyboard focus, and safe cancellation.
function showNext() {
  if (showing || !queue.length || typeof document === "undefined") return;
  showing = true;
  const { title, message, buttons, options } = queue.shift()!;
  const actions = buttons?.length ? buttons : [{ text: "OK" }];
  const previousFocus = document.activeElement as HTMLElement | null;
  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-labelledby", "sapta-alert-title");
  dialog.setAttribute("aria-describedby", "sapta-alert-message");
  Object.assign(dialog.style, {
    width: "min(420px, calc(100vw - 40px))", boxSizing: "border-box",
    maxHeight: "calc(100dvh - 40px)", overflowY: "auto", padding: "24px",
    border: "1px solid #E9DFD3", borderRadius: "24px", background: "#FFFBF5",
    color: "#2F3B4E", boxShadow: "0 20px 80px #3D300033", fontFamily: "inherit",
  });
  const heading = document.createElement("h2");
  heading.id = "sapta-alert-title";
  heading.textContent = title;
  Object.assign(heading.style, { margin: "0 0 12px", fontSize: "20px" });
  const description = document.createElement("p");
  description.id = "sapta-alert-message";
  description.textContent = message ?? "";
  Object.assign(description.style, { whiteSpace: "pre-wrap", lineHeight: "1.5", margin: "0 0 24px" });
  const group = document.createElement("div");
  Object.assign(group.style, { display: "flex", flexDirection: "column", gap: "8px" });
  let finished = false;
  const finish = (callback?: () => void) => {
    if (finished) return;
    finished = true;
    dialog.close();
    dialog.remove();
    previousFocus?.focus();
    // Keep showing=true during callbacks: nested alerts join the same queue.
    try { callback?.(); } finally { showing = false; showNext(); }
  };
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.text ?? "OK";
    Object.assign(button.style, {
      minHeight: "44px", padding: "12px 16px", borderRadius: "12px",
      border: "1px solid #E9DFD3", cursor: "pointer", font: "inherit", fontWeight: "600",
      background: action.style === "cancel" ? "transparent" : "#FFFFFF",
      color: action.style === "destructive" ? "#B42318" : "#2F3B4E",
    });
    button.onclick = () => finish(action.onPress);
    group.append(button);
  });
  dialog.oncancel = (event) => {
    event.preventDefault();
    const cancel = actions.find((action) => action.style === "cancel");
    if (cancel) finish(cancel.onPress);
    else if (options?.cancelable) finish(options.onDismiss);
    else if (actions.length === 1 && actions[0].style !== "destructive") finish();
  };
  dialog.append(heading, description, group);
  document.body.append(dialog);
  dialog.showModal();
  const initial = Math.max(0, actions.findIndex((action) => action.style === "cancel"));
  (group.children[initial] as HTMLButtonElement).focus();
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
    if (typeof document === "undefined") return;
    queue.push({ title, message, buttons, options });
    showNext();
  },
};
