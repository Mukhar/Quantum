/**
 * Results panel hydrator — vanilla TS, no framework.
 *
 * Subscribes to the sandbox `circuit` signal, re-runs the simulator on
 * every change, and pushes the derived per-qubit quantities into the
 * static scaffold rendered by `ResultsPanel.astro`.
 *
 * Render strategy mirrors `composer.client.ts`:
 *  - One `requestAnimationFrame` batch per change (drags emit a flurry
 *    of signal writes; we coalesce).
 *  - Cards exist in the DOM at SSR time and are toggled `hidden` based
 *    on the live qubit count — zero layout shift when the user bumps
 *    qubits up or down.
 *  - Numeric fields use `textContent`, never `innerHTML`. The only
 *    geometry mutated per frame is two SVG line endpoints and four bar
 *    widths per card. Comfortably under one paint per frame at 4q.
 *
 * Error policy: a malformed circuit (which shouldn't happen — the
 * store's `commit()` validates — but defense in depth never hurts)
 * sets the status line to "Circuit invalid" and leaves the previous
 * frame on screen. We do NOT throw; the panel is a read surface.
 */

import { circuit } from "./store";
import { runCircuit, type Circuit } from "../quantum/circuit";
import {
  reducedDensityMatrix,
  blochVectorFromRho,
  marginalProbabilities,
  type BlochVector,
} from "../quantum/reducedDensity";
import { formatState } from "../quantum/format";

/** r below this ⇒ flag the qubit as entangled / mixed. */
const ENTANGLED_THRESHOLD = 0.98;

/** SVG arrow geometry: arrow tip travels on a circle of this radius
 *  centred at (50, 50). Matches the static SVG in ResultsPanel.astro. */
const SVG_CENTER = 50;
const SVG_RADIUS = 40;

interface CardRefs {
  root: HTMLElement;
  arrow: SVGLineElement;
  tip: SVGCircleElement;
  badge: HTMLElement;
  p0Bar: HTMLElement;
  p1Bar: HTMLElement;
  p0Text: HTMLElement;
  p1Text: HTMLElement;
}

interface PanelRefs {
  panel: HTMLElement;
  status: HTMLElement;
  stateReadout: HTMLElement;
  cards: CardRefs[];
}

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Wire the panel under `host` to the sandbox circuit signal. Returns
 * an unsubscribe function for symmetry with the rest of the sandbox's
 * mount API; nothing currently calls it but tests / future teardown
 * paths will appreciate it.
 */
export function mountResults(host: HTMLElement = document.body): () => void {
  const panel = host.querySelector<HTMLElement>("[data-results-panel]");
  if (!panel) return () => {};

  const refs = collectRefs(panel);
  if (!refs) return () => {};

  // Apply a one-time CSS transition opt-in so updates aren't completely
  // janky when motion is allowed.
  if (!reduceMotion) {
    for (const c of refs.cards) {
      c.arrow.style.transition = "x2 180ms ease-out, y2 180ms ease-out";
      c.tip.style.transition = "cx 180ms ease-out, cy 180ms ease-out";
      c.p0Bar.style.transition = "width 180ms ease-out";
      c.p1Bar.style.transition = "width 180ms ease-out";
    }
  }

  let frameQueued = false;
  let latest: Circuit = circuit.value;

  const flush = () => {
    frameQueued = false;
    render(refs, latest);
  };

  const unsubscribe = circuit.subscribe((next) => {
    latest = next;
    if (frameQueued) return;
    frameQueued = true;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(flush);
    } else {
      flush();
    }
  });

  return () => {
    unsubscribe();
  };
}

/* -------------------------------------------------------------------------- */
/* DOM lookups --------------------------------------------------------------- */

function collectRefs(panel: HTMLElement): PanelRefs | null {
  const status = panel.querySelector<HTMLElement>('[data-role="status"]');
  const stateReadout = panel.querySelector<HTMLElement>('[data-role="state-readout"]');
  const cardEls = Array.from(panel.querySelectorAll<HTMLElement>("[data-qubit-card]"));
  if (!status || !stateReadout || cardEls.length === 0) return null;

  const cards: CardRefs[] = [];
  for (const root of cardEls) {
    const arrow = root.querySelector<SVGLineElement>('[data-role="arrow"]');
    const tip = root.querySelector<SVGCircleElement>('[data-role="tip"]');
    const badge = root.querySelector<HTMLElement>('[data-role="entangled-badge"]');
    const p0Bar = root.querySelector<HTMLElement>('[data-role="p0-bar"]');
    const p1Bar = root.querySelector<HTMLElement>('[data-role="p1-bar"]');
    const p0Text = root.querySelector<HTMLElement>('[data-role="p0-text"]');
    const p1Text = root.querySelector<HTMLElement>('[data-role="p1-text"]');
    if (!arrow || !tip || !badge || !p0Bar || !p1Bar || !p0Text || !p1Text) return null;
    cards.push({ root, arrow, tip, badge, p0Bar, p1Bar, p0Text, p1Text });
  }

  return { panel, status, stateReadout, cards };
}

/* -------------------------------------------------------------------------- */
/* Per-frame render ---------------------------------------------------------- */

function render(refs: PanelRefs, c: Circuit): void {
  // Show only the first `c.qubits` cards.
  for (let i = 0; i < refs.cards.length; i++) {
    refs.cards[i].root.classList.toggle("hidden", i >= c.qubits);
  }

  let result;
  try {
    result = runCircuit(c);
  } catch (err) {
    refs.status.textContent = "Circuit invalid";
    refs.status.classList.add("text-rose-400");
    return;
  }

  refs.status.classList.remove("text-rose-400");
  refs.status.textContent = `${c.qubits} qubit${c.qubits === 1 ? "" : "s"} · ${countOps(c)} ops`;

  const state = result.sim.state;

  for (let q = 0; q < c.qubits; q++) {
    const rho = reducedDensityMatrix(state, q, c.qubits);
    const bloch = blochVectorFromRho(rho);
    const [p0, p1] = marginalProbabilities(state, q, c.qubits);
    updateCard(refs.cards[q], bloch, p0, p1);
  }

  refs.stateReadout.textContent = `|ψ⟩ = ${formatState(state, c.qubits)}`;
}

function updateCard(card: CardRefs, bloch: BlochVector, p0: number, p1: number): void {
  // Project the Bloch vector onto the X-Z plane for the 2D card. We
  // intentionally hide y depth here (the sandbox uses 4 cards on
  // screen — a flat picture is more legible than a half-rendered 3D
  // one). The "entangled" badge plus the shrunken arrow length carry
  // the missing-information signal.
  const tipX = SVG_CENTER + bloch.x * SVG_RADIUS;
  const tipY = SVG_CENTER - bloch.z * SVG_RADIUS;

  card.arrow.setAttribute("x2", tipX.toFixed(2));
  card.arrow.setAttribute("y2", tipY.toFixed(2));
  card.tip.setAttribute("cx", tipX.toFixed(2));
  card.tip.setAttribute("cy", tipY.toFixed(2));

  const entangled = bloch.r < ENTANGLED_THRESHOLD;
  card.badge.classList.toggle("hidden", !entangled);
  // Fade the arrow when the qubit isn't purely separable — the
  // single-qubit picture is partial information.
  const opacity = (0.3 + 0.7 * bloch.r).toFixed(3);
  card.arrow.setAttribute("stroke-opacity", opacity);
  card.tip.setAttribute("fill-opacity", opacity);

  card.p0Bar.style.width = `${(p0 * 100).toFixed(2)}%`;
  card.p1Bar.style.width = `${(p1 * 100).toFixed(2)}%`;
  card.p0Text.textContent = p0.toFixed(3);
  card.p1Text.textContent = p1.toFixed(3);
}

function countOps(c: Circuit): number {
  let n = 0;
  for (const step of c.steps) n += step.length;
  return n;
}
