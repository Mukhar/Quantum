/**
 * Sphere3D — Three.js Bloch sphere with a draggable arrow.
 *
 * Lazy-loaded by `index.astro` (dynamic import) so Three.js never
 * touches the homepage bundle.
 *
 * Drag flow:
 *  1. Pointer down on the arrow's tip sphere → enable dragging.
 *  2. Pointer move → raycast onto the unit sphere; the hit point is the
 *     new Bloch vector. Convert to (θ, φ), push to store.
 *  3. Pointer up → release.
 *
 * When the store updates from outside (e.g. a gate button), we re-orient
 * the arrow with a short tween. `prefers-reduced-motion` skips the tween.
 *
 * Theme reactivity:
 *  - Reads scene + arrow + axis colors from CSS custom properties on
 *    mount (--color-canvas-bg, --color-bloch-arrow, --color-line, …).
 *  - Listens for `themechange` on `window` and re-applies palette in
 *    place (no scene rebuild) plus one render pass.
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  LineBasicMaterial,
  BufferGeometry,
  Line,
  Vector3,
  CylinderGeometry,
  ConeGeometry,
  Group,
  Raycaster,
  Vector2,
  Color,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  LinearFilter,
} from "three";
import type { Store } from "../../lib/quantum/store";
import { stateToBloch, blochToCartesian, cartesianToBloch } from "../../lib/quantum/bloch";

const TWEEN_MS = 200;

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Read a CSS custom property as a Three.js Color. Values in theme.css
 * are RGB triplets (e.g. "165 180 252"); convert to a hex int.
 * Falls back to a sensible dark-palette default if the var is missing.
 */
function readCssColor(varName: string, fallback: number): Color {
  if (typeof document === "undefined") return new Color(fallback);
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return new Color(fallback);
  const parts = raw.split(/\s+/).map((n) => parseInt(n, 10));
  if (parts.length < 3 || parts.some(Number.isNaN)) return new Color(fallback);
  const [r, g, b] = parts;
  return new Color(r / 255, g / 255, b / 255);
}

interface BlochPalette {
  wire: Color;        // --color-line — wireframe sphere
  ghost: Color;       // --color-surface-elevated — back-face fill
  axis: Color;        // --color-ink-subtle — axis lines
  arrow: Color;       // --color-bloch-arrow — shaft + head
  arrowTip: Color;    // --color-accent-emphasis — tip handle (brighter)
}

function readBlochPalette(): BlochPalette {
  return {
    wire: readCssColor("--color-line", 0x334155),
    ghost: readCssColor("--color-surface-elevated", 0x0f172a),
    axis: readCssColor("--color-ink-subtle", 0x64748b),
    arrow: readCssColor("--color-bloch-arrow", 0x818cf8),
    arrowTip: readCssColor("--color-accent-emphasis", 0xa5b4fc),
  };
}

/**
 * Build a billboard label sprite from a canvas-rendered string. Returns
 * the sprite plus a `refresh(color)` callback that re-paints the texture
 * (used on theme change) and a `dispose()` for teardown.
 *
 * Why sprites: Three.js has no first-class text. Sprites with a
 * CanvasTexture are the cheapest way to get crisp, always-camera-facing
 * labels; depthTest is disabled so labels stay legible when the camera
 * orbits past their world position.
 */
function makeLabelSprite(text: string, color: Color) {
  const FONT_PX = 96;
  const PAD_X = 18;
  const PAD_Y = 10;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `600 ${FONT_PX}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const w = Math.max(1, Math.ceil(metrics.width) + PAD_X * 2);
  const h = FONT_PX + PAD_Y * 2;
  canvas.width = w;
  canvas.height = h;

  const paint = (c: Color) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.fillStyle = `#${c.getHexString()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, h / 2);
  };
  paint(color);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new Sprite(material);
  // World-units scale. Make the label ~0.22 world-units tall.
  const worldH = 0.22;
  sprite.scale.set((w / h) * worldH, worldH, 1);
  sprite.renderOrder = 1000;

  return {
    sprite,
    refresh: (c: Color) => {
      paint(c);
      texture.needsUpdate = true;
    },
    dispose: () => {
      texture.dispose();
      material.dispose();
    },
  };
}

export function mountSphere3D(mount: HTMLElement, store: Store): () => void {
  mount.innerHTML = "";
  const rect = mount.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 320;

  const scene = new Scene();
  scene.background = null;

  const camera = new PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(2.4, 1.8, 2.4);
  camera.lookAt(0, 0, 0);

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";

  // Lighting
  scene.add(new AmbientLight(0xffffff, 0.7));
  const dir = new DirectionalLight(0xffffff, 0.6);
  dir.position.set(3, 4, 5);
  scene.add(dir);

  // Initial palette read.
  let palette = readBlochPalette();

  // Wire sphere
  const wireMaterial = new MeshBasicMaterial({
    color: palette.wire,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });
  const sphere = new Mesh(new SphereGeometry(1, 32, 32), wireMaterial);
  scene.add(sphere);

  // Solid back-face sphere so the arrow doesn't poke through visibly.
  const ghostMaterial = new MeshBasicMaterial({
    color: palette.ghost,
    transparent: true,
    opacity: 0.6,
  });
  const ghost = new Mesh(new SphereGeometry(0.99, 24, 24), ghostMaterial);
  scene.add(ghost);

  // Axes lines
  const axisMaterial = new LineBasicMaterial({ color: palette.axis });
  const axisLine = (a: Vector3, b: Vector3) => {
    const g = new BufferGeometry().setFromPoints([a, b]);
    return new Line(g, axisMaterial);
  };
  scene.add(axisLine(new Vector3(-1.2, 0, 0), new Vector3(1.2, 0, 0)));
  scene.add(axisLine(new Vector3(0, -1.2, 0), new Vector3(0, 1.2, 0)));
  scene.add(axisLine(new Vector3(0, 0, -1.2), new Vector3(0, 0, 1.2)));

  // Great-circle guides — equator + two meridians give the sphere
  // legible depth cues that the uniform wireframe alone doesn't. All
  // three are unit-radius circles on principal planes.
  const ringMaterial = new LineBasicMaterial({
    color: palette.wire,
    transparent: true,
    opacity: 0.7,
  });
  const ringGeometries: BufferGeometry[] = [];
  const makeRing = (plane: "xy" | "xz" | "yz") => {
    const segments = 96;
    const pts: Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      if (plane === "xy") pts.push(new Vector3(c, s, 0));
      else if (plane === "xz") pts.push(new Vector3(c, 0, s));
      else pts.push(new Vector3(0, c, s));
    }
    const geom = new BufferGeometry().setFromPoints(pts);
    ringGeometries.push(geom);
    return new Line(geom, ringMaterial);
  };
  scene.add(makeRing("xz")); // equator — through |+⟩, |+i⟩, |−⟩, |−i⟩
  scene.add(makeRing("xy")); // front meridian — through |0⟩, |+⟩, |1⟩, |−⟩
  scene.add(makeRing("yz")); // side meridian — through |0⟩, |+i⟩, |1⟩, |−i⟩

  // Axis labels — one sprite per pole. Positions are in Three's frame
  // (Y up). Mapping back to physics: three.y = |0⟩/|1⟩ axis, three.x =
  // |+⟩/|−⟩ axis, three.z = |+i⟩/|−i⟩ axis (see physicsToWorld below).
  const LABEL_R = 1.36;
  type Label = ReturnType<typeof makeLabelSprite>;
  const labels: Label[] = [
    // text, position
    [`|0⟩`,  new Vector3(0,  LABEL_R, 0)],
    [`|1⟩`,  new Vector3(0, -LABEL_R, 0)],
    [`|+⟩`,  new Vector3( LABEL_R, 0, 0)],
    [`|−⟩`,  new Vector3(-LABEL_R, 0, 0)],
    [`|+i⟩`, new Vector3(0, 0,  LABEL_R)],
    [`|−i⟩`, new Vector3(0, 0, -LABEL_R)],
  ].map(([text, pos]) => {
    const label = makeLabelSprite(text as string, palette.axis);
    label.sprite.position.copy(pos as Vector3);
    scene.add(label.sprite);
    return label;
  });

  // Arrow group: shaft (cylinder) + head (cone) + tip handle (sphere)
  const arrow = new Group();
  const shaftMaterial = new MeshBasicMaterial({ color: palette.arrow });
  const shaft = new Mesh(
    new CylinderGeometry(0.02, 0.02, 0.88, 12),
    shaftMaterial,
  );
  shaft.position.set(0, 0.44, 0);
  arrow.add(shaft);
  const headMaterial = new MeshBasicMaterial({ color: palette.arrow });
  const head = new Mesh(new ConeGeometry(0.06, 0.18, 16), headMaterial);
  head.position.set(0, 0.94, 0);
  arrow.add(head);
  const tipMaterial = new MeshBasicMaterial({ color: palette.arrowTip });
  const tip = new Mesh(new SphereGeometry(0.09, 16, 16), tipMaterial);
  tip.position.set(0, 1, 0);
  arrow.add(tip);

  // Ghost overlay arrow: same geometry, drawn ON TOP of everything else
  // (depthTest off, high renderOrder) so the arrow remains visible when
  // it swings into the back hemisphere — otherwise the front-facing
  // ghost sphere would occlude it. Only made visible when the arrow
  // actually points away from the camera (toggled per render below).
  const GHOST_OPACITY = 0.32;
  const ghostShaftMaterial = new MeshBasicMaterial({
    color: palette.arrow,
    transparent: true,
    opacity: GHOST_OPACITY,
    depthTest: false,
    depthWrite: false,
  });
  const ghostShaftGeom = new CylinderGeometry(0.02, 0.02, 0.88, 12);
  const ghostShaft = new Mesh(ghostShaftGeom, ghostShaftMaterial);
  ghostShaft.position.set(0, 0.44, 0);
  ghostShaft.renderOrder = 998;
  ghostShaft.visible = false;
  arrow.add(ghostShaft);

  const ghostHeadMaterial = new MeshBasicMaterial({
    color: palette.arrow,
    transparent: true,
    opacity: GHOST_OPACITY,
    depthTest: false,
    depthWrite: false,
  });
  const ghostHeadGeom = new ConeGeometry(0.06, 0.18, 16);
  const ghostHead = new Mesh(ghostHeadGeom, ghostHeadMaterial);
  ghostHead.position.set(0, 0.94, 0);
  ghostHead.renderOrder = 998;
  ghostHead.visible = false;
  arrow.add(ghostHead);

  const ghostTipMaterial = new MeshBasicMaterial({
    color: palette.arrowTip,
    transparent: true,
    opacity: GHOST_OPACITY + 0.12,
    depthTest: false,
    depthWrite: false,
  });
  const ghostTipGeom = new SphereGeometry(0.09, 16, 16);
  const ghostTip = new Mesh(ghostTipGeom, ghostTipMaterial);
  ghostTip.position.set(0, 1, 0);
  ghostTip.renderOrder = 999;
  ghostTip.visible = false;
  arrow.add(ghostTip);

  // The whole arrow points along +Y in its local frame. We orient it
  // by setting arrow.quaternion to align +Y with the target Bloch vector.
  scene.add(arrow);

  // Orient the arrow toward a unit-length world-space vector.
  const orientArrow = (v: Vector3) => {
    arrow.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), v.clone().normalize());
    requestRender();
  };

  // Convert physics (x, y, z) — z = up = |0⟩ — into Three's frame where
  // y is up. Mapping: physicsZ → three.y, physicsX → three.x, physicsY → three.z.
  const physicsToWorld = ({ x, y, z }: { x: number; y: number; z: number }): Vector3 =>
    new Vector3(x, z, y);
  const worldToPhysics = (v: Vector3) => ({ x: v.x, y: v.z, z: v.y });

  // Initial orientation = current store state.
  const initial = stateToBloch(store.snapshot().state);
  let currentVec = physicsToWorld(blochToCartesian(initial));
  orientArrow(currentVec);

  // Tween helper for outside-driven state changes.
  let tweenRaf: number | null = null;
  const tweenTo = (target: Vector3) => {
    if (reduceMotion) {
      currentVec = target.clone();
      orientArrow(currentVec);
      return;
    }
    const start = currentVec.clone();
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / TWEEN_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = start.clone().lerp(target, eased).normalize();
      currentVec = v;
      orientArrow(v);
      if (t < 1) tweenRaf = requestAnimationFrame(step);
    };
    if (tweenRaf !== null) cancelAnimationFrame(tweenRaf);
    tweenRaf = requestAnimationFrame(step);
  };

  // Render loop — render on demand, not every frame.
  let renderRaf: number | null = null;
  const ARROW_LOCAL_UP = new Vector3(0, 1, 0);
  const tmpArrowDir = new Vector3();
  const tmpCamDir = new Vector3();
  const updateGhostVisibility = () => {
    // Arrow's tip direction in world space.
    tmpArrowDir.copy(ARROW_LOCAL_UP).applyQuaternion(arrow.quaternion);
    // Direction from origin to camera. If the arrow tip points the
    // opposite way (dot < 0), it's on the far hemisphere — show ghost.
    tmpCamDir.copy(camera.position).normalize();
    const facingAway = tmpArrowDir.dot(tmpCamDir) < 0;
    ghostShaft.visible = facingAway;
    ghostHead.visible = facingAway;
    ghostTip.visible = facingAway;
  };
  const requestRender = () => {
    if (renderRaf !== null) return;
    renderRaf = requestAnimationFrame(() => {
      renderRaf = null;
      updateGhostVisibility();
      renderer.render(scene, camera);
    });
  };

  // (no patching needed — orientArrow already calls requestRender)

  // Drag handling
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let dragging = false;
  let pointerId: number | null = null;

  const setPointer = (clientX: number, clientY: number) => {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
  };

  const hitSphere = (clientX: number, clientY: number): Vector3 | null => {
    setPointer(clientX, clientY);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(sphere, false);
    if (hits.length === 0) return null;
    return hits[0].point.clone().normalize();
  };

  const onPointerDown = (e: PointerEvent) => {
    // Only grab when the user clicks near the arrow tip.
    setPointer(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, camera);
    const onTip = raycaster.intersectObject(tip, false).length > 0;
    const onSphere = raycaster.intersectObject(sphere, false).length > 0;
    if (!onTip && !onSphere) return;
    dragging = true;
    pointerId = e.pointerId;
    renderer.domElement.setPointerCapture(pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const hit = hitSphere(e.clientX, e.clientY);
    if (!hit) return;
    currentVec = hit.clone();
    orientArrow(currentVec);
    const physics = worldToPhysics(currentVec);
    const { theta, phi } = cartesianToBloch(physics);
    store.setStateFromBloch(theta, phi);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (pointerId !== null) {
      try { renderer.domElement.releasePointerCapture(pointerId); } catch { /* noop */ }
      pointerId = null;
    }
    e.preventDefault?.();
  };

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);

  // Subscribe to outside updates (gate buttons, sliders).
  const unsubscribe = store.subscribe((snap) => {
    if (dragging) return; // don't fight the user
    const { theta, phi } = stateToBloch(snap.state);
    const target = physicsToWorld(blochToCartesian({ theta, phi }));
    tweenTo(target);
  });

  // Handle resize
  const onResize = () => {
    const r = mount.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height, false);
    requestRender();
  };
  window.addEventListener("resize", onResize, { passive: true });

  // Pause rendering when tab is hidden.
  const onVisibility = () => {
    if (!document.hidden) requestRender();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // Theme reactivity — re-read CSS vars and apply to existing materials.
  const onThemeChange = () => {
    palette = readBlochPalette();
    wireMaterial.color.copy(palette.wire);
    ghostMaterial.color.copy(palette.ghost);
    axisMaterial.color.copy(palette.axis);
    ringMaterial.color.copy(palette.wire);
    shaftMaterial.color.copy(palette.arrow);
    headMaterial.color.copy(palette.arrow);
    tipMaterial.color.copy(palette.arrowTip);
    ghostShaftMaterial.color.copy(palette.arrow);
    ghostHeadMaterial.color.copy(palette.arrow);
    ghostTipMaterial.color.copy(palette.arrowTip);
    for (const l of labels) l.refresh(palette.axis);
    requestRender();
  };
  window.addEventListener("themechange", onThemeChange);

  // First paint
  requestRender();

  return () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("themechange", onThemeChange);
    document.removeEventListener("visibilitychange", onVisibility);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", onPointerUp);
    if (tweenRaf !== null) cancelAnimationFrame(tweenRaf);
    if (renderRaf !== null) cancelAnimationFrame(renderRaf);
    for (const l of labels) l.dispose();
    ghostShaftMaterial.dispose();
    ghostHeadMaterial.dispose();
    ghostTipMaterial.dispose();
    ghostShaftGeom.dispose();
    ghostHeadGeom.dispose();
    ghostTipGeom.dispose();
    ringMaterial.dispose();
    for (const g of ringGeometries) g.dispose();
    renderer.dispose();
    mount.innerHTML = "";
  };
}
