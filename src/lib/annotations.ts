/**
 * AnnotationsLayer — per-page sticky-note pinning.
 *
 * Architecture:
 *   - One layer per essay page, scoped to a key (defaults to pathname).
 *   - Notes are stored as { widgetId, xPct, yPct, text } in localStorage.
 *   - A note pins to the *widget* it was placed on, not to the document,
 *     so layout shifts (responsive collapse, KaTeX render) don't move it.
 *   - Click an empty area of an annotatable widget to add a note;
 *     click an existing pin to focus it; press Esc to close.
 *
 * Pure DOM — no framework. Mounted from the page's `<script>`.
 */

const MAX_NOTES = 25;
const LS_PREFIX = "quantum.annotations.v1.";

export interface Note {
  id: string;
  widgetId: string;
  xPct: number;
  yPct: number;
  text: string;
}

const load = (key: string): Note[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is Note =>
      n && typeof n.id === "string" && typeof n.widgetId === "string" &&
      typeof n.xPct === "number" && typeof n.yPct === "number" &&
      typeof n.text === "string",
    );
  } catch {
    return [];
  }
};

const save = (key: string, notes: Note[]): void => {
  if (typeof localStorage === "undefined") return;
  try {
    // Soft-evict oldest if over the cap.
    const trimmed = notes.slice(-MAX_NOTES);
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(trimmed));
  } catch {
    /* quota full — silently drop */
  }
};

const newId = (): string =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `n${Date.now()}${Math.floor(Math.random() * 1e6)}`;

export interface AnnotationsApi {
  /** Clear all notes for this page. */
  reset: () => void;
}

/**
 * Make every element matching `annotatableSelector` a target for pinning.
 *
 * @param key  localStorage key suffix (defaults to window.location.pathname).
 */
export function mountAnnotations(
  annotatableSelector = "[data-annotatable]",
  key: string = typeof window !== "undefined" ? window.location.pathname : "default",
): AnnotationsApi {
  if (typeof document === "undefined") return { reset: () => {} };
  const targets = Array.from(document.querySelectorAll<HTMLElement>(annotatableSelector));
  if (targets.length === 0) return { reset: () => {} };

  let notes = load(key);

  const renderAll = () => {
    for (const target of targets) {
      // Wipe existing pins.
      target.querySelectorAll(".annotation-pin").forEach((n) => n.remove());
      const wid = target.dataset.widgetId ?? target.dataset.widget ?? "anon";
      const cs = window.getComputedStyle(target);
      if (cs.position === "static") target.style.position = "relative";
      for (const note of notes.filter((n) => n.widgetId === wid)) {
        target.appendChild(buildPin(note, onChange, onDelete));
      }
    }
  };

  const onChange = (id: string, text: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    note.text = text;
    save(key, notes);
  };

  const onDelete = (id: string) => {
    notes = notes.filter((n) => n.id !== id);
    save(key, notes);
    renderAll();
  };

  for (const target of targets) {
    const wid = target.dataset.widgetId ?? target.dataset.widget ?? "anon";
    target.addEventListener("dblclick", (event) => {
      // dbl-click on the widget background to drop a new pin.
      const rect = target.getBoundingClientRect();
      const xPct = ((event.clientX - rect.left) / rect.width) * 100;
      const yPct = ((event.clientY - rect.top) / rect.height) * 100;
      if (notes.length >= MAX_NOTES) notes = notes.slice(-(MAX_NOTES - 1));
      const note: Note = { id: newId(), widgetId: wid, xPct, yPct, text: "" };
      notes.push(note);
      save(key, notes);
      renderAll();
      // Focus the new pin's textarea.
      target.querySelector<HTMLTextAreaElement>(
        `.annotation-pin[data-id="${note.id}"] textarea`,
      )?.focus();
    });
  }

  renderAll();

  return {
    reset() {
      notes = [];
      save(key, notes);
      renderAll();
    },
  };
}

function buildPin(
  note: Note,
  onChange: (id: string, text: string) => void,
  onDelete: (id: string) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className =
    "annotation-pin absolute z-10 flex flex-col items-start gap-1 -translate-x-1/2 -translate-y-1/2";
  wrap.style.left = `${note.xPct}%`;
  wrap.style.top = `${note.yPct}%`;
  wrap.dataset.id = note.id;

  const dot = document.createElement("button");
  dot.type = "button";
  dot.className =
    "h-4 w-4 rounded-full bg-amber-400 ring-2 ring-amber-200/40 hover:scale-110 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200";
  dot.setAttribute("aria-label", "Annotation pin (click to toggle note)");

  const note_el = document.createElement("div");
  note_el.className =
    "hidden flex-col gap-1 rounded-md border border-amber-300/40 bg-amber-50 text-amber-900 p-2 text-xs shadow-lg w-48";

  const ta = document.createElement("textarea");
  ta.className = "w-full h-16 resize-none bg-transparent text-amber-900 focus:outline-none";
  ta.placeholder = "Your note…";
  ta.value = note.text;
  ta.addEventListener("input", () => onChange(note.id, ta.value));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "self-end text-[10px] uppercase tracking-widest text-amber-700 hover:text-amber-900";
  del.textContent = "Delete";
  del.addEventListener("click", () => onDelete(note.id));

  note_el.appendChild(ta);
  note_el.appendChild(del);

  dot.addEventListener("click", () => {
    note_el.classList.toggle("hidden");
    note_el.classList.toggle("flex");
    if (note_el.classList.contains("flex")) ta.focus();
  });

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      note_el.classList.add("hidden");
      note_el.classList.remove("flex");
      dot.focus();
    }
  });

  wrap.appendChild(dot);
  wrap.appendChild(note_el);
  return wrap;
}
