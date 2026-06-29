/**
 * Polar2D — SVG fallback Bloch view.
 *
 * Renders the Bloch vector projected onto the X–Z plane (so |0⟩ at top,
 * |1⟩ at bottom, |+⟩ at right, |−⟩ at left). Drag the arrow tip to set
 * the qubit state. Touch-friendly.
 *
 * Limitations vs. the 3D backend:
 *  - We don't show φ; the projection collapses the Y axis. We pin
 *    φ = 0 on drag (state stays on the great X–Z circle). When the
 *    *store* updates with a φ ≠ 0 state (from a gate), the arrow's
 *    polar angle still reflects θ accurately, and we tint the arrow
 *    to hint "there's depth you're not seeing".
 *
 * That's an honest tradeoff: the fallback is for tiny screens / no-WebGL
 * users, and we'd rather give them a manipulable circle than an
 * inscrutable orthographic projection.
 */

import type { Store } from "../../lib/quantum/store";
import { stateToBloch } from "../../lib/quantum/bloch";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Read a CSS custom property as an `rgb()` string. Falls back to a dark
 * default if the var is missing or malformed. Theme.css defines values
 * as RGB triplets (e.g. "165 180 252") so we wrap them in rgb(...).
 */
function readCssRgb(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length < 3) return fallback;
  return `rgb(${parts[0]} ${parts[1]} ${parts[2]})`;
}

interface Polar2DPalette {
  equator: string;
  axis: string;
  label: string;
  arrow: string;
}

function readPolar2DPalette(): Polar2DPalette {
  return {
    equator: readCssRgb("--color-line-strong", "rgb(71 85 105)"),
    axis: readCssRgb("--color-line", "rgb(51 65 85)"),
    label: readCssRgb("--color-ink-subtle", "rgb(148 163 184)"),
    arrow: readCssRgb("--color-bloch-arrow", "rgb(129 140 248)"),
  };
}

export function mountPolar2D(mount: HTMLElement, store: Store): () => void {
  mount.innerHTML = "";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 200");
  svg.setAttribute("class", "w-full h-full");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Bloch sphere — 2D polar projection");
  mount.appendChild(svg);

  const cx = 100;
  const cy = 100;
  const r = 80;

  let palette = readPolar2DPalette();

  const make = (name: string, attrs: Record<string, string | number>) => {
    const el = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
    return el;
  };

  // Equator + axes
  const equator = make("circle", { cx, cy, r, fill: "none", stroke: palette.equator, "stroke-opacity": 0.5 });
  const vAxis = make("line", { x1: cx, y1: cy - r, x2: cx, y2: cy + r, stroke: palette.axis });
  const hAxis = make("line", { x1: cx - r, y1: cy, x2: cx + r, y2: cy, stroke: palette.axis });

  // Pole + equator labels
  const labelEls: SVGTextElement[] = [];
  const label = (x: number, y: number, text: string) => {
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(y));
    t.setAttribute("fill", palette.label);
    t.setAttribute("font-size", "12");
    t.setAttribute("font-family", "ui-monospace, monospace");
    t.setAttribute("text-anchor", "middle");
    t.textContent = text;
    svg.appendChild(t);
    labelEls.push(t);
  };
  label(cx, cy - r - 6, "|0⟩");
  label(cx, cy + r + 14, "|1⟩");
  label(cx + r + 12, cy + 4, "|+⟩");
  label(cx - r - 12, cy + 4, "|−⟩");

  // Arrow shaft + tip handle
  const shaft = make("line", {
    x1: cx, y1: cy, x2: cx, y2: cy - r,
    stroke: palette.arrow, "stroke-width": 3, "stroke-linecap": "round",
  }) as SVGLineElement;
  const tip = make("circle", {
    cx, cy: cy - r, r: 10,
    fill: palette.arrow, cursor: "grab",
  }) as SVGCircleElement;

  // Re-apply palette to existing nodes — no SVG rebuild required.
  const applyPalette = () => {
    palette = readPolar2DPalette();
    equator.setAttribute("stroke", palette.equator);
    vAxis.setAttribute("stroke", palette.axis);
    hAxis.setAttribute("stroke", palette.axis);
    for (const el of labelEls) el.setAttribute("fill", palette.label);
    shaft.setAttribute("stroke", palette.arrow);
    tip.setAttribute("fill", palette.arrow);
  };

  // Convert (θ, φ_proj) to the tip's (x, y) on the SVG, where we project
  // onto the X-Z great circle. Practically: angle from +Z, signed by cos(φ).
  const polarToXY = (theta: number, phi: number) => {
    // signed angle in [-π, π] for the projection
    const xzAngle = theta * (Math.cos(phi) >= 0 ? 1 : -1);
    return {
      x: cx + r * Math.sin(xzAngle),
      y: cy - r * Math.cos(xzAngle),
    };
  };

  const setTip = (theta: number, phi: number) => {
    const { x, y } = polarToXY(theta, phi);
    tip.setAttribute("cx", String(x));
    tip.setAttribute("cy", String(y));
    shaft.setAttribute("x2", String(x));
    shaft.setAttribute("y2", String(y));
    // Hint at hidden φ depth with opacity.
    const flat = Math.abs(Math.sin(phi));
    tip.setAttribute("fill-opacity", String(1 - 0.35 * flat));
  };

  let dragging = false;
  let pointerId: number | null = null;

  const onPointerDown = (e: PointerEvent) => {
    dragging = true;
    pointerId = e.pointerId;
    tip.setPointerCapture(pointerId);
    tip.style.cursor = "grabbing";
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const dx = local.x - cx;
    const dy = cy - local.y; // flip y to mathematical convention
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) return;
    // Project to the great X-Z circle: φ ∈ {0, π} depending on sign of x.
    const newPhi = dx >= 0 ? 0 : Math.PI;
    // θ is the angle from +Z (positive y direction in our math frame).
    const theta = Math.atan2(Math.abs(dx), dy);
    const clampedTheta = Math.min(Math.PI, Math.max(0, theta));
    store.setStateFromBloch(clampedTheta, newPhi);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null) {
      try { tip.releasePointerCapture(pointerId); } catch { /* noop */ }
      pointerId = null;
    }
    tip.style.cursor = "grab";
  };

  tip.addEventListener("pointerdown", onPointerDown);
  tip.addEventListener("pointermove", onPointerMove);
  tip.addEventListener("pointerup", onPointerUp);
  tip.addEventListener("pointercancel", onPointerUp);

  const unsubscribe = store.subscribe((snap) => {
    const { theta, phi } = stateToBloch(snap.state);
    setTip(theta, phi);
  });

  // Theme reactivity
  const onThemeChange = () => applyPalette();
  window.addEventListener("themechange", onThemeChange);

  return () => {
    unsubscribe();
    window.removeEventListener("themechange", onThemeChange);
    tip.removeEventListener("pointerdown", onPointerDown);
    tip.removeEventListener("pointermove", onPointerMove);
    tip.removeEventListener("pointerup", onPointerUp);
    tip.removeEventListener("pointercancel", onPointerUp);
    mount.innerHTML = "";
  };
}
