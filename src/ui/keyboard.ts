import { WONDERS, type Wonder } from "../wonders";

export interface KeyboardActions {
  onVisitWonder: (wonder: Wonder) => void;
  onEscape: () => void;
  onToggleTour: () => void;
  onToggleOrbit: () => void;
  onPostcard: () => void;
  onRealtimeSolar: () => void;
}

const KEY_MAP: Record<string, number> = {
  "0": 10,
  "-": 11,
  "=": 12,
  "+": 12,
  "[": 13,
  "]": 14,
  "\\": 15,
  ";": 16,
  "'": 17,
  ",": 18,
  ".": 19,
  "/": 20,
  "?": 20,
  j: 21,
  J: 21,
  k: 22,
  K: 22,
  l: 23,
  L: 23,
};

export function setupKeyboardShortcuts(actions: KeyboardActions): () => void {
  const handler = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = event.key;
    const num = KEY_MAP[key] ?? Number(key);
    if (!isNaN(num) && num >= 1 && num <= WONDERS.length) {
      const wonder = WONDERS[num - 1];
      if (wonder) actions.onVisitWonder(wonder);
      return;
    }

    if (event.key === "Escape") {
      actions.onEscape();
      return;
    }

    if (event.key.toLowerCase() === "t" && !event.ctrlKey && !event.metaKey) {
      actions.onToggleTour();
      return;
    }

    if (event.key.toLowerCase() === "o" && !event.ctrlKey && !event.metaKey) {
      actions.onToggleOrbit();
      return;
    }

    if (event.key.toLowerCase() === "p" && !event.ctrlKey && !event.metaKey) {
      actions.onPostcard();
      return;
    }

    if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) {
      actions.onRealtimeSolar();
      return;
    }
  };

  window.addEventListener("keydown", handler);
  return () => {
    window.removeEventListener("keydown", handler);
  };
}
