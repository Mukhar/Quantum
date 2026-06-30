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

export type { Circuit, Op, DiscreteGate, RotAxis, RunResult } from "./circuit";
export {
  DISCRETE_GATES,
  ROT_AXES,
  OP_KINDS,
  MAX_QUBITS,
  MAX_STEPS,
  emptyCircuit,
  validateCircuit,
  runCircuit,
  opQubits,
  gateOp,
  cnotOp,
  rotOp,
  measureOp,
} from "./circuit";

export {
  encodeCircuit,
  decodeCircuit,
  roundTrip,
  CodecError,
  UnsupportedVersionError,
  CODEC_VERSION,
} from "./codec";

export {
  toQiskit,
  QiskitExportError,
  QISKIT_GATE_MAP,
  QISKIT_ROT_MAP,
} from "./qiskit";
export type { ToQiskitOptions } from "./qiskit";

export {
  cz,
  teleportationCircuit,
  teleportationSteps,
} from "./teleportation";
export type { ProtocolStep, TeleportationOpts } from "./teleportation";

export {
  encodingOps,
  superdenseCircuit,
  superdenseSteps,
  decodeSuperdense,
  allSuperdenseCases,
  SUPERDENSE_MESSAGES,
  BELL_STATE_LABEL,
  ENCODING_GATE_LABEL,
} from "./superdense";
export type {
  SuperdenseBits,
  SuperdenseDecodeResult,
  SuperdenseCircuitOpts,
} from "./superdense";

export { replayProtocol } from "./protocolStepper";

export { endpointsEntangled } from "./network";
export type { NetworkEdgeState } from "./network";

export {
  optimalGroverIterations,
  basisLabels,
  prepareUniform,
  applyPhaseOracle,
  applyDiffusion,
  runGrover,
  buildGroverCircuit,
} from "./grover";
export type { GroverRunOptions, GroverSnapshot } from "./grover";

export {
  qftState,
  inverseQftState,
  normalizeState,
  probabilitiesFromState,
  stateFromBasisIndices,
  modPow,
  gcd,
  findMultiplicativePeriod,
  periodPeakHints,
} from "./qft";
export type { PeriodResult } from "./qft";

export {
  buildShor15,
  toQiskitShor15,
  SHOR15_QUBITS,
  SHOR15_DESCRIPTION,
} from "./shor";
export type {
  ShorStaticCircuit,
  StaticCircuitOp,
  ShorBlock,
  ShorBlockId,
  ShorRegisterLayout,
} from "./shor";
