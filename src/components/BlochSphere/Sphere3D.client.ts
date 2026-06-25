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
} from "three";
import type { Store } from "../../lib/quantum/store";
import { stateToBloch, blochToCartesian, cartesianToBloch } from "../../lib/quantum/bloch";

const TWEEN_MS = 200;

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  // Wire sphere
  const sphere = new Mesh(
    new SphereGeometry(1, 32, 32),
    new MeshBasicMaterial({ color: 0x334155, wireframe: true, transparent: true, opacity: 0.35 }),
  );
  scene.add(sphere);

  // Solid back-face sphere so the arrow doesn't poke through visibly.
  const ghost = new Mesh(
    new SphereGeometry(0.99, 24, 24),
    new MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.6 }),
  );
  scene.add(ghost);

  // Axes lines
  const axisMaterial = new LineBasicMaterial({ color: 0x64748b });
  const axisLine = (a: Vector3, b: Vector3) => {
    const g = new BufferGeometry().setFromPoints([a, b]);
    return new Line(g, axisMaterial);
  };
  scene.add(axisLine(new Vector3(-1.2, 0, 0), new Vector3(1.2, 0, 0)));
  scene.add(axisLine(new Vector3(0, -1.2, 0), new Vector3(0, 1.2, 0)));
  scene.add(axisLine(new Vector3(0, 0, -1.2), new Vector3(0, 0, 1.2)));

  // Arrow group: shaft (cylinder) + head (cone) + tip handle (sphere)
  const arrow = new Group();
  const arrowColor = new Color(0x818cf8);
  const shaft = new Mesh(
    new CylinderGeometry(0.02, 0.02, 0.88, 12),
    new MeshBasicMaterial({ color: arrowColor }),
  );
  shaft.position.set(0, 0.44, 0);
  arrow.add(shaft);
  const head = new Mesh(
    new ConeGeometry(0.06, 0.18, 16),
    new MeshBasicMaterial({ color: arrowColor }),
  );
  head.position.set(0, 0.94, 0);
  arrow.add(head);
  const tip = new Mesh(
    new SphereGeometry(0.09, 16, 16),
    new MeshBasicMaterial({ color: 0xa5b4fc }),
  );
  tip.position.set(0, 1, 0);
  arrow.add(tip);
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
  const requestRender = () => {
    if (renderRaf !== null) return;
    renderRaf = requestAnimationFrame(() => {
      renderRaf = null;
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

  // First paint
  requestRender();

  return () => {
    unsubscribe();
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", onPointerUp);
    if (tweenRaf !== null) cancelAnimationFrame(tweenRaf);
    if (renderRaf !== null) cancelAnimationFrame(renderRaf);
    renderer.dispose();
    mount.innerHTML = "";
  };
}
