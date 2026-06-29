/**
 * Challenge mode runtime hydrator.
 *
 * Responsibilities:
 *  - Look up the puzzle for this page by slug.
 *  - Subscribe to the sandbox `circuit` signal; on every change, run
 *    the circuit and compute fidelity against the puzzle's target.
 *  - Update three DOM regions, all addressed by data attributes so
 *    the .astro page owns the markup and we own the wiring:
 *      [data-challenge-status]   — coloured badge ("Solved!" / "Close" / "Not there yet").
 *      [data-challenge-hint]     — empty until the user clicks the
 *                                   reveal button; then fills with
 *                                   hints[0] (first click) and
 *                                   appends hints[1] (second click).
 *      [data-challenge-open]     — anchor that copies the current
 *                                   circuit fragment back into the
 *                                   main sandbox (so a half-solved
 *                                   attempt can be saved & explored).
 *
 * We deliberately do NOT mutate the sandbox store from in here — the
 * puzzle page already mounts the regular composer, which owns the
 * authoritative `circuit` signal. We are a read-only observer + a
 * tiny pile of badges.
 */

import { circuit } from "../store";
import { runCircuit } from "../../quantum/circuit";
import { encodeCircuit } from "../../quantum/codec";
import { fidelity, SUCCESS_FIDELITY } from "../../quantum/fidelity";
import { puzzleBySlug, type Puzzle } from "./data";

const CLOSE_FIDELITY = 0.9;

/** Class strings for the three status tiers. Kept here so the .astro
 *  template's container is class-free and we don't fight over styles. */
const STATUS_TIERS = {
  solved: {
    bg: "bg-positive/20 border-positive text-positive",
    icon: "\u2713", // check mark
    label: "Solved!",
  },
  close: {
    bg: "bg-warning/20 border-warning text-warning",
    icon: "≈",
    label: "Close — keep tuning",
  },
  cold: {
    bg: "bg-surface-sunken/70 border-line-strong text-ink-muted",
    icon: "·",
    label: "Not there yet",
  },
} as const;

const BASE_BADGE_CLASS =
  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";

export function mountChallengeRuntime(slug: string): void {
  const puzzle = puzzleBySlug(slug);
  if (!puzzle) {
    console.warn(`challenge runtime: unknown puzzle slug "${slug}"`);
    return;
  }

  const statusEl = document.querySelector<HTMLElement>("[data-challenge-status]");
  const hintBtn = document.querySelector<HTMLButtonElement>("[data-challenge-hint-btn]");
  const hintBox = document.querySelector<HTMLElement>("[data-challenge-hint]");
  const openLink = document.querySelector<HTMLAnchorElement>("[data-challenge-open]");

  if (statusEl) attachStatus(statusEl, puzzle);
  if (hintBtn && hintBox) attachHints(hintBtn, hintBox, puzzle);
  if (openLink) attachOpenInSandbox(openLink);
}

/* -------------------------------------------------------------------------- */
/* Status badge */

function attachStatus(el: HTMLElement, puzzle: Puzzle) {
  const target = puzzle.target();
  let raf: number | null = null;

  const render = () => {
    raf = null;
    let f: number;
    try {
      const { sim } = runCircuit(circuit.value);
      if (sim.state.length !== target.length) {
        // Wrong qubit count for this puzzle — tell the user gently.
        applyTier(el, "cold", `wrong size (need ${puzzle.qubits} qubits)`);
        return;
      }
      f = fidelity(sim.state, target);
    } catch (err) {
      // A half-built circuit (e.g. two ops on the same qubit in one
      // step) throws. That's fine — it's a "not there yet" state.
      applyTier(el, "cold", "circuit not runnable yet");
      return;
    }
    const tier = f >= SUCCESS_FIDELITY ? "solved" : f >= CLOSE_FIDELITY ? "close" : "cold";
    applyTier(el, tier, `F=${f.toFixed(3)}`);
  };

  const schedule = () => {
    if (raf !== null) return;
    raf = requestAnimationFrame(render);
  };

  circuit.subscribe(schedule);
  // Render once on mount in case subscribe-with-replay didn't catch
  // the initial value (depends on signal semantics; cheap belt+braces).
  schedule();
}

function applyTier(el: HTMLElement, tier: keyof typeof STATUS_TIERS, detail: string) {
  const t = STATUS_TIERS[tier];
  el.className = `${BASE_BADGE_CLASS} ${t.bg}`;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML =
    `<span aria-hidden="true" class="font-mono">${t.icon}</span>` +
    `<span>${escapeHtml(t.label)}</span>` +
    `<span class="font-mono text-xs opacity-80">(${escapeHtml(detail)})</span>`;
}

/* -------------------------------------------------------------------------- */
/* Hint reveal */

function attachHints(btn: HTMLButtonElement, box: HTMLElement, puzzle: Puzzle) {
  const total = puzzle.hints.length;
  if (total === 0) {
    btn.disabled = true;
    btn.textContent = "No hints for this one";
    return;
  }
  let shown = 0;
  const updateBtn = () => {
    if (shown >= total) {
      btn.disabled = true;
      btn.textContent = "All hints shown";
    } else {
      btn.textContent =
        shown === 0 ? "Show a hint" : `Show next hint (${shown + 1}/${total})`;
    }
  };
  updateBtn();
  btn.addEventListener("click", () => {
    if (shown >= total) return;
    const li = document.createElement("li");
    li.className = "text-sm text-ink-muted leading-relaxed";
    li.textContent = puzzle.hints[shown];
    box.appendChild(li);
    shown += 1;
    updateBtn();
  });
}

/* -------------------------------------------------------------------------- */
/* "Open in sandbox" link — copies current circuit fragment over. */

function attachOpenInSandbox(link: HTMLAnchorElement) {
  const refresh = () => {
    try {
      const fragment = encodeCircuit(circuit.value);
      link.href = `/sandbox#${fragment}`;
      link.removeAttribute("aria-disabled");
    } catch (_err) {
      link.href = "/sandbox";
      link.setAttribute("aria-disabled", "true");
    }
  };
  circuit.subscribe(refresh);
  refresh();
}

/* -------------------------------------------------------------------------- */

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
