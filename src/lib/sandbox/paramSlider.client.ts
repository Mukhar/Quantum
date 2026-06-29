/**
 * Popover slider for editing a rot op's θ.
 *
 * Mounts itself by listening for `sandbox:open-param-slider` events
 * dispatched by the composer when the user selects a cell containing
 * a rotation. Position is calculated from the selected cell's DOMRect.
 */
import { circuit, commit, selectedCell, type SelectedCell } from "./store";
import type { Op } from "../quantum/circuit";

const POPOVER_HEIGHT = 110;
const POPOVER_WIDTH = 256;
const MARGIN = 8;
const TAU = Math.PI * 2;

let host: HTMLDivElement | null = null;

export function mountParamSlider(grid: HTMLElement) {
  document.addEventListener("sandbox:open-param-slider", () => {
    open(grid);
  });
  // Re-position / re-validate on selection change.
  selectedCell.subscribe((sel) => {
    if (!host) return;
    if (!isRotAt(sel)) {
      close();
      return;
    }
    repositionAndRender(grid, sel);
  });
  document.addEventListener("mousedown", (ev) => {
    if (!host) return;
    const target = ev.target as HTMLElement;
    if (target.closest("[data-param-slider]")) return;
    if (target.closest("[data-cell]")) return; // selection change handles its own life cycle
    close();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") close();
  });
}

function open(grid: HTMLElement) {
  const sel = selectedCell.value;
  if (!isRotAt(sel)) return;
  if (!host) {
    host = document.createElement("div");
    host.dataset.paramSlider = "true";
    host.className = "fixed z-30 w-64 rounded-md border border-line-strong bg-surface-elevated shadow-xl p-3";
    host.setAttribute("role", "dialog");
    document.body.appendChild(host);
  }
  repositionAndRender(grid, sel);
}

function close() {
  if (!host) return;
  host.remove();
  host = null;
}

function isRotAt(sel: SelectedCell): boolean {
  const op = opAtCell(sel);
  return op?.kind === "rot";
}

function opAtCell({ qubit, step }: SelectedCell): Op | null {
  const c = circuit.value;
  if (step < 0 || step >= c.steps.length) return null;
  return c.steps[step].find((o) => o.kind === "rot" && o.qubit === qubit) ?? null;
}

function repositionAndRender(grid: HTMLElement, sel: SelectedCell) {
  if (!host) return;
  const cellEl = grid.querySelector<HTMLElement>(`[data-cell="${sel.qubit},${sel.step}"]`);
  const rect = cellEl?.getBoundingClientRect() ?? null;
  const op = opAtCell(sel);
  if (!op || op.kind !== "rot") {
    close();
    return;
  }

  const top = rect && rect.top - POPOVER_HEIGHT - MARGIN > MARGIN
    ? rect.top - POPOVER_HEIGHT - MARGIN
    : (rect ? rect.bottom + MARGIN : window.innerHeight / 2 - POPOVER_HEIGHT / 2);
  const left = rect
    ? Math.max(MARGIN, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - MARGIN))
    : window.innerWidth / 2 - POPOVER_WIDTH / 2;
  host.style.top = `${top}px`;
  host.style.left = `${left}px`;

  host.innerHTML = `
    <div class="flex items-baseline justify-between mb-2">
      <span class="font-mono text-sm text-positive">R${op.axis.toLowerCase()}(θ) · q${op.qubit}</span>
      <span class="text-xs text-ink-subtle tabular-nums" data-theta-label>${formatTheta(op.theta)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="${TAU}"
      step="${TAU / 1024}"
      value="${op.theta}"
      data-theta-input
      class="w-full accent-emerald-400"
      aria-label="Rotation angle in radians"
      aria-valuetext="${formatTheta(op.theta)}"
    />
    <div class="mt-2 flex justify-between text-xs text-ink-subtle">
      <button type="button" data-theta-preset="0" class="hover:text-ink">0</button>
      <button type="button" data-theta-preset="${Math.PI / 2}" class="hover:text-ink">π/2</button>
      <button type="button" data-theta-preset="${Math.PI}" class="hover:text-ink">π</button>
      <button type="button" data-theta-preset="${(3 * Math.PI) / 2}" class="hover:text-ink">3π/2</button>
    </div>
  `;

  const input = host.querySelector<HTMLInputElement>("[data-theta-input]")!;
  const label = host.querySelector<HTMLElement>("[data-theta-label]")!;
  input.focus();
  input.addEventListener("input", () => {
    const next = parseFloat(input.value);
    setTheta(op, next);
    label.textContent = formatTheta(next);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowLeft" ? -1 : 1;
      const mag = e.shiftKey ? Math.PI / 8 : Math.PI / 64;
      const next = wrap(op.theta + dir * mag);
      setTheta(op, next);
      input.value = String(next);
      label.textContent = formatTheta(next);
    } else if (e.key === "0") {
      e.preventDefault();
      setTheta(op, 0);
      input.value = "0";
      label.textContent = formatTheta(0);
    } else if (e.key === "p" || e.key === "π") {
      e.preventDefault();
      setTheta(op, Math.PI);
      input.value = String(Math.PI);
      label.textContent = formatTheta(Math.PI);
    }
  });
  for (const preset of host.querySelectorAll<HTMLButtonElement>("[data-theta-preset]")) {
    preset.addEventListener("click", () => {
      const next = parseFloat(preset.dataset.thetaPreset!);
      setTheta(op, next);
      input.value = String(next);
      label.textContent = formatTheta(next);
    });
  }
}

function setTheta(op: Op & { kind: "rot" }, raw: number) {
  const wrapped = wrap(raw);
  commit((c) => {
    const sel = selectedCell.value;
    const steps = c.steps.slice();
    steps[sel.step] = steps[sel.step].map((o) =>
      o.kind === "rot" && o.qubit === op.qubit ? { ...o, theta: wrapped } : o,
    );
    return { qubits: c.qubits, steps };
  });
}

function wrap(theta: number) {
  return ((theta % TAU) + TAU) % TAU;
}

function formatTheta(theta: number): string {
  const ratio = theta / Math.PI;
  const snaps = [
    [0, "0"], [0.25, "π/4"], [0.5, "π/2"], [0.75, "3π/4"],
    [1, "π"], [1.25, "5π/4"], [1.5, "3π/2"], [1.75, "7π/4"], [2, "2π"],
  ] as const;
  for (const [r, label] of snaps) {
    if (Math.abs(ratio - r) < 0.005) return label;
  }
  return `${theta.toFixed(3)} rad`;
}
