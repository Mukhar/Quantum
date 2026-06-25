/**
 * Public API barrel for the quantum simulator.
 *
 * Importers should reach for `@/lib/quantum` — never the individual
 * modules. Keeps the surface area honest and lets us refactor internals
 * without ripple-edits across widgets.
 */

export type { Complex } from "./complex";
export { c, ZERO, ONE, add, sub, mul, scale, normSquared, approxEqual } from "./complex";

export type { Gate2x2, GateName, RotationAxis } from "./gates";
export { X, Y, Z, I, H, S, T, GATES, Rx, Ry, Rz, ROTATIONS } from "./gates";

export { Simulator } from "./simulator";
export type { SimulatorOptions } from "./simulator";
