/**
 * Sandbox composer — vanilla TS hydrator.
 *
 * Reads the DOM scaffold rendered by `/sandbox/index.astro`, attaches
 * pointer + keyboard handlers, and writes through the sandbox store.
 *
 * Why DOM-first instead of a virtual DOM: the composer's interactive
 * surface is essentially a grid + a palette of buttons. A targeted
 * cell re-render (one `<button>` per change) is cheaper and more
 * inspectable than a vdom diff, and it keeps the bundle under 5 KB.
 *
 * Re-renders are scheduled via `requestAnimationFrame` to coalesce
 * bursts (e.g. dragging a rotation slider fires `input` per pixel).
 */
import {
  circuit,
  selectedCell,
  draggingGate,
  visibleSteps,
  commit,
  placeOp,
  removeOpAt,
  opAt,
  showToast,
  type DraggingGate,
} from "./store";
import {
  gateOp,
  rotOp,
  cnotOp,
  measureOp,
  type DiscreteGate,
  type Op,
  type RotAxis,
} from "../quantum/circuit";
import { mountParamSlider } from "./paramSlider.client";
import { initHistory, undo, redo, canUndo, canRedo } from "./history";
import { hydrateFromUrlOrStorage, startAutoPersist, copyShareUrl, copyQiskitSnippet } from "./persistence";
import { emptyCircuit } from "../quantum/circuit";
import { padToVisibleSteps, DEFAULT_QUBITS, DEFAULT_STEPS } from "./store";

interface PendingCnot {
  control: number;
  step: number;
}

let pendingCnot: PendingCnot | null = null;

const PALETTE_ITEMS: Array<{
  label: string;
  kind: DraggingGate["kind"];
  family: "pauli" | "hadamard" | "phase" | "rot" | "cnot" | "measure";
  hint: string;
  shortcut: string;
}> = [
  { label: "X", kind: "X", family: "pauli", hint: "Pauli-X (NOT)", shortcut: "1" },
  { label: "Y", kind: "Y", family: "pauli", hint: "Pauli-Y", shortcut: "2" },
  { label: "Z", kind: "Z", family: "pauli", hint: "Pauli-Z (phase flip)", shortcut: "3" },
  { label: "H", kind: "H", family: "hadamard", hint: "Hadamard", shortcut: "4" },
  { label: "S", kind: "S", family: "phase", hint: "Phase (π/2)", shortcut: "5" },
  { label: "T", kind: "T", family: "phase", hint: "T gate (π/4)", shortcut: "6" },
  { label: "•—⊕", kind: "CNOT", family: "cnot", hint: "CNOT — drop on control, tap target in same column", shortcut: "7" },
  { label: "Rx(θ)", kind: "Rx", family: "rot", hint: "Rotation around X", shortcut: "8" },
  { label: "Ry(θ)", kind: "Ry", family: "rot", hint: "Rotation around Y", shortcut: "9" },
  { label: "Rz(θ)", kind: "Rz", family: "rot", hint: "Rotation around Z", shortcut: "0" },
  { label: "M", kind: "measure", family: "measure", hint: "Measure in Z basis", shortcut: "m" },
];

const FAMILY_ACCENT: Record<string, { bg: string; text: string; border: string }> = {
  pauli: { bg: "bg-rose-600 hover:bg-rose-500", text: "text-rose-300", border: "border-rose-600" },
  hadamard: { bg: "bg-accent hover:bg-accent", text: "text-accent", border: "border-accent" },
  phase: { bg: "bg-violet-600 hover:bg-violet-500", text: "text-violet-300", border: "border-violet-500" },
  rot: { bg: "bg-positive hover:bg-positive", text: "text-positive", border: "border-positive" },
  cnot: { bg: "bg-warning hover:bg-warning", text: "text-warning", border: "border-warning" },
  measure: { bg: "bg-line-strong hover:bg-line-strong", text: "text-ink", border: "border-line-strong" },
};

const TOUCH_PICKUP_MS = 250;
const TOUCH_CANCEL_PX = 8;

/* -------------------------------------------------------------------------- */
/* Public entrypoints */

export function mountComposer(root: HTMLElement) {
  const palette = root.querySelector<HTMLDivElement>("[data-sandbox-palette]");
  const grid = root.querySelector<HTMLDivElement>("[data-sandbox-grid]");
  const toolbar = root.querySelector<HTMLDivElement>("[data-sandbox-toolbar]");
  if (!palette || !grid) {
    console.warn("sandbox composer: missing palette or grid scaffold");
    return;
  }

  // Hydrate state BEFORE setting up subscriptions so initial render
  // reflects the URL/storage circuit, not the default empty one.
  initHistory();
  hydrateFromUrlOrStorage();
  startAutoPersist();

  renderPalette(palette);
  attachPaletteHandlers(palette);

  renderGrid(grid);
  attachGridHandlers(grid);

  if (toolbar) attachToolbar(toolbar);

  // Re-render on any state change.
  let queued = false;
  const queueRender = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderGrid(grid);
      renderPaletteHighlights(palette);
    });
  };
  circuit.subscribe(queueRender);
  selectedCell.subscribe(queueRender);
  draggingGate.subscribe(queueRender);
  visibleSteps.subscribe(queueRender);

  attachKeyboardShortcuts();
  mountParamSlider(grid);
}

/* -------------------------------------------------------------------------- */
/* Palette */

function renderPalette(palette: HTMLDivElement) {
  palette.innerHTML = "";
  palette.setAttribute("role", "toolbar");
  palette.setAttribute("aria-label", "Gate palette");
  for (const item of PALETTE_ITEMS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.paletteKind = item.kind;
    btn.dataset.family = item.family;
    const accent = FAMILY_ACCENT[item.family];
    btn.className =
      `relative h-12 rounded font-mono text-sm font-semibold text-white shadow-sm transition-colors ${accent.bg}`;
    btn.title = `${item.hint} (shortcut: ${item.shortcut})`;
    btn.setAttribute("aria-label", item.hint);
    btn.innerHTML =
      `${escapeHtml(item.label)}<span class="absolute top-0.5 right-1 text-[10px] opacity-50">${escapeHtml(item.shortcut)}</span>`;
    btn.draggable = true;
    palette.appendChild(btn);
  }
  // Cancel pickup row
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.dataset.paletteCancel = "true";
  cancel.className = "col-span-full text-xs text-ink-subtle hover:text-ink underline-offset-4 hover:underline mt-1";
  cancel.textContent = "Cancel pickup (Esc)";
  palette.appendChild(cancel);
}

function renderPaletteHighlights(palette: HTMLDivElement) {
  const armed = draggingGate.value?.kind ?? null;
  for (const btn of palette.querySelectorAll<HTMLButtonElement>("[data-palette-kind]")) {
    const kind = btn.dataset.paletteKind;
    if (kind === armed) {
      btn.classList.add("ring-2", "ring-offset-2", "ring-offset-slate-900", "ring-white");
    } else {
      btn.classList.remove("ring-2", "ring-offset-2", "ring-offset-slate-900", "ring-white");
    }
  }
}

function attachPaletteHandlers(palette: HTMLDivElement) {
  palette.addEventListener("click", (ev) => {
    const target = ev.target as HTMLElement;
    const cancel = target.closest<HTMLButtonElement>("[data-palette-cancel]");
    if (cancel) {
      draggingGate.set(null);
      return;
    }
    const btn = target.closest<HTMLButtonElement>("[data-palette-kind]");
    if (!btn) return;
    arm(btn.dataset.paletteKind as DraggingGate["kind"]);
  });
  palette.addEventListener("dragstart", (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-palette-kind]");
    if (!btn || !ev.dataTransfer) return;
    arm(btn.dataset.paletteKind as DraggingGate["kind"]);
    ev.dataTransfer.effectAllowed = "copy";
    ev.dataTransfer.setData("text/plain", btn.dataset.paletteKind ?? "");
  });
  palette.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch") return;
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-palette-kind]");
    if (!btn) return;
    const startX = ev.clientX;
    const startY = ev.clientY;
    const timer = window.setTimeout(() => {
      arm(btn.dataset.paletteKind as DraggingGate["kind"]);
    }, TOUCH_PICKUP_MS);
    const cancel = (mv: PointerEvent) => {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      if (dx * dx + dy * dy > TOUCH_CANCEL_PX * TOUCH_CANCEL_PX) {
        window.clearTimeout(timer);
        cleanup();
      }
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", cancel);
      window.removeEventListener("pointerup", cleanup);
    };
    window.addEventListener("pointermove", cancel);
    window.addEventListener("pointerup", cleanup);
  });
}

function arm(kind: DraggingGate["kind"]) {
  if (draggingGate.value?.kind === kind) {
    draggingGate.set(null);
    return;
  }
  draggingGate.set({
    kind,
    theta: kind === "Rx" || kind === "Ry" || kind === "Rz" ? Math.PI / 2 : undefined,
  });
}

/* -------------------------------------------------------------------------- */
/* Grid */

function renderGrid(grid: HTMLDivElement) {
  const c = circuit.value;
  const steps = visibleSteps.value;
  const sel = selectedCell.value;

  grid.style.gridTemplateColumns = `64px repeat(${steps}, 56px)`;
  grid.innerHTML = "";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", "Circuit grid");

  // Header row
  grid.appendChild(text("div", "qubit", "text-xs text-ink-subtle uppercase tracking-widest"));
  for (let t = 0; t < steps; t++) {
    grid.appendChild(text("div", `t${t}`, "text-center text-xs text-ink-subtle tabular-nums"));
  }

  // Body rows
  for (let q = 0; q < c.qubits; q++) {
    grid.appendChild(text("div", `q${q}`, "flex items-center justify-end pr-2 text-sm font-mono text-ink-subtle"));
    for (let t = 0; t < steps; t++) {
      grid.appendChild(renderCell(q, t, opAt(c, q, t), sel.qubit === q && sel.step === t));
    }
  }
}

function renderCell(q: number, t: number, op: Op | null, selected: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.cell = `${q},${t}`;
  btn.setAttribute("role", "gridcell");
  btn.setAttribute("aria-rowindex", String(q + 2));
  btn.setAttribute("aria-colindex", String(t + 2));
  btn.setAttribute("aria-selected", String(selected));
  btn.setAttribute(
    "aria-label",
    op ? `Qubit ${q}, step ${t}: ${describeOp(op, q)}` : `Qubit ${q}, step ${t}, empty`,
  );

  const accent = op ? cellFamily(op) : null;
  const accentClass = accent ? FAMILY_ACCENT[accent].border : "border-dashed border-line-strong hover:border-line-strong";
  const textClass = accent ? FAMILY_ACCENT[accent].text : "";
  const fillClass = op ? "bg-surface-sunken" : "";

  const pending = pendingCnot && pendingCnot.step === t && pendingCnot.control === q;

  btn.className =
    `relative h-12 rounded-md border ${accentClass} ${fillClass} ${textClass} ` +
    `${selected ? "outline outline-2 outline-accent" : ""} ` +
    `${pending ? "ring-2 ring-amber-400" : ""} transition-colors font-mono text-sm`;

  btn.textContent = pending ? "•?" : op ? cellLabel(op, q) : "";
  btn.draggable = false;
  return btn;
}

function attachGridHandlers(grid: HTMLDivElement) {
  grid.addEventListener("click", (ev) => {
    const cell = cellOfEvent(ev);
    if (!cell) return;
    handleCellAction(cell.q, cell.t, (cell.el as HTMLElement).getBoundingClientRect());
  });
  grid.addEventListener("contextmenu", (ev) => {
    const cell = cellOfEvent(ev);
    if (!cell) return;
    ev.preventDefault();
    commit((c) => removeOpAt(c, cell.q, cell.t));
  });
  grid.addEventListener("mousedown", (ev) => {
    if (ev.button !== 1) return;
    const cell = cellOfEvent(ev);
    if (!cell) return;
    ev.preventDefault();
    commit((c) => removeOpAt(c, cell.q, cell.t));
  });
  grid.addEventListener("dragover", (ev) => {
    const cell = cellOfEvent(ev);
    if (!cell) return;
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "copy";
  });
  grid.addEventListener("drop", (ev) => {
    const cell = cellOfEvent(ev);
    if (!cell) return;
    ev.preventDefault();
    handleCellAction(cell.q, cell.t, (cell.el as HTMLElement).getBoundingClientRect());
  });
}

function cellOfEvent(ev: Event): { q: number; t: number; el: Element } | null {
  const target = ev.target as HTMLElement | null;
  if (!target) return null;
  const cell = target.closest<HTMLElement>("[data-cell]");
  if (!cell) return null;
  const [q, t] = cell.dataset.cell!.split(",").map(Number);
  return { q, t, el: cell };
}

function handleCellAction(q: number, t: number, _anchor: DOMRect) {
  const c = circuit.value;
  const existing = opAt(c, q, t);

  // Resolve pending CNOT target.
  if (pendingCnot && pendingCnot.step === t && pendingCnot.control !== q) {
    const ctrl = pendingCnot.control;
    pendingCnot = null;
    commit((c) => placeOp(c, cnotOp(ctrl, q), t));
    selectedCell.set({ qubit: q, step: t });
    return;
  }
  if (pendingCnot && pendingCnot.step === t && pendingCnot.control === q) {
    pendingCnot = null;
    renderGridDeferred();
    return;
  }

  const dg = draggingGate.value;
  if (dg) {
    if (dg.kind === "CNOT") {
      pendingCnot = { control: q, step: t };
      draggingGate.set(null);
      selectedCell.set({ qubit: q, step: t });
      renderGridDeferred();
      return;
    }
    const op = makeOp(dg, q);
    try {
      commit((c) => placeOp(c, op, t));
      selectedCell.set({ qubit: q, step: t });
    } catch (err) {
      showToast((err as Error).message, "error");
    }
    draggingGate.set(null);
    return;
  }

  // No drag — just select.
  selectedCell.set({ qubit: q, step: t });
  if (existing && existing.kind === "rot") {
    // ParamSlider listens on selectedCell + the synthetic event below.
    dispatchOpenParamSlider();
  }
}

function dispatchOpenParamSlider() {
  document.dispatchEvent(new CustomEvent("sandbox:open-param-slider"));
}

function renderGridDeferred() {
  // Trigger one extra frame to reflect pendingCnot (a module-local var,
  // not a signal — keep it that way; promoting it adds noise).
  requestAnimationFrame(() => {
    const grid = document.querySelector<HTMLDivElement>("[data-sandbox-grid]");
    if (grid) renderGrid(grid);
  });
}

/* -------------------------------------------------------------------------- */
/* Keyboard */

function attachToolbar(toolbar: HTMLElement) {
  const undoBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='undo']");
  const redoBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='redo']");
  const shareBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='share']");
  const qiskitBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='qiskit']");
  const resetBtn = toolbar.querySelector<HTMLButtonElement>("[data-action='reset']");
  const qubitsSel = toolbar.querySelector<HTMLSelectElement>("[data-action='qubits']");

  undoBtn?.addEventListener("click", () => undo());
  redoBtn?.addEventListener("click", () => redo());
  shareBtn?.addEventListener("click", () => { void copyShareUrl(); });
  qiskitBtn?.addEventListener("click", () => { void copyQiskitSnippet(); });
  resetBtn?.addEventListener("click", () => {
    commit(() => padToVisibleSteps(emptyCircuit(circuit.value.qubits), DEFAULT_STEPS));
  });
  qubitsSel?.addEventListener("change", () => {
    const n = parseInt(qubitsSel.value, 10);
    if (!Number.isInteger(n) || n < 1 || n > 4) return;
    commit((c) => {
      const filtered = c.steps.map((step) =>
        step.filter((op) => {
          switch (op.kind) {
            case "gate":
            case "rot":
            case "measure":
              return op.qubit < n;
            case "cnot":
              return op.control < n && op.target < n;
          }
        }),
      );
      return padToVisibleSteps({ qubits: n, steps: filtered }, DEFAULT_STEPS);
    });
  });

  if (qubitsSel) qubitsSel.value = String(circuit.value.qubits);

  // Reactive enable/disable.
  const sync = () => {
    if (undoBtn) undoBtn.disabled = !canUndo.value;
    if (redoBtn) redoBtn.disabled = !canRedo.value;
    if (qubitsSel) qubitsSel.value = String(circuit.value.qubits);
  };
  canUndo.subscribe(sync);
  canRedo.subscribe(sync);
  circuit.subscribe(sync);
}

function attachKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (isTypingInForm(e.target)) return;
    // Undo/redo first — they MUST win over palette shortcuts.
    const meta = e.metaKey || e.ctrlKey;
    if (meta && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (meta && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "Escape") {
      draggingGate.set(null);
      pendingCnot = null;
      renderGridDeferred();
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      const { qubit, step } = selectedCell.value;
      commit((c) => removeOpAt(c, qubit, step));
      return;
    }
    // Palette shortcuts: 1..9 0 m
    const match = PALETTE_ITEMS.find((it) => it.shortcut === e.key.toLowerCase());
    if (match) {
      // Insert immediately at the selected cell (rather than just arming),
      // so keyboard-driven composition is fast.
      const { qubit, step } = selectedCell.value;
      if (match.kind === "CNOT") {
        pendingCnot = { control: qubit, step };
        renderGridDeferred();
      } else {
        try {
          commit((c) => placeOp(c, makeOp({ kind: match.kind, theta: Math.PI / 2 }, qubit), step));
        } catch (err) {
          showToast((err as Error).message, "error");
        }
      }
      return;
    }
    // Arrow nav
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      const c = circuit.value;
      const { qubit, step } = selectedCell.value;
      let nq = qubit;
      let nt = step;
      if (e.key === "ArrowLeft") nt = Math.max(0, step - 1);
      if (e.key === "ArrowRight") nt = Math.min(visibleSteps.value - 1, step + 1);
      if (e.key === "ArrowUp") nq = Math.max(0, qubit - 1);
      if (e.key === "ArrowDown") nq = Math.min(c.qubits - 1, qubit + 1);
      if (nq !== qubit || nt !== step) {
        e.preventDefault();
        selectedCell.set({ qubit: nq, step: nt });
      }
    }
  });
}

function isTypingInForm(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

/* -------------------------------------------------------------------------- */
/* Helpers */

function makeOp(dg: DraggingGate, qubit: number): Op {
  switch (dg.kind) {
    case "X": case "Y": case "Z":
    case "H": case "S": case "T":
    case "I":
      return gateOp(dg.kind as DiscreteGate, qubit);
    case "Rx": case "Ry": case "Rz":
      return rotOp(dg.kind.slice(1) as RotAxis, qubit, dg.theta ?? Math.PI / 2);
    case "measure":
      return measureOp(qubit);
    case "CNOT":
      throw new Error("CNOT placement is multi-step; should not call makeOp");
  }
}

function cellLabel(op: Op, q: number): string {
  switch (op.kind) {
    case "gate": return op.gate;
    case "rot": return `R${op.axis.toLowerCase()}`;
    case "measure": return "M";
    case "cnot": return op.control === q ? "•" : "⊕";
  }
}

function describeOp(op: Op, q: number): string {
  switch (op.kind) {
    case "gate": return `gate ${op.gate}`;
    case "rot": return `rotation R${op.axis.toLowerCase()}(${op.theta.toFixed(3)})`;
    case "measure": return "measurement";
    case "cnot":
      return op.control === q ? `CNOT control (target q${op.target})` : `CNOT target (control q${op.control})`;
  }
}

function cellFamily(op: Op): "pauli" | "hadamard" | "phase" | "rot" | "cnot" | "measure" {
  switch (op.kind) {
    case "gate":
      if (op.gate === "X" || op.gate === "Y" || op.gate === "Z" || op.gate === "I") return "pauli";
      if (op.gate === "H") return "hadamard";
      return "phase";
    case "rot": return "rot";
    case "measure": return "measure";
    case "cnot": return "cnot";
  }
}

function text(tag: string, body: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = body;
  return el;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
