/**
 * Sandbox → save current circuit into the gallery.
 *
 * Lazy-loaded from /sandbox only — keeps gallery code out of essay
 * bundles. Wires the "Save" button in the toolbar to a modal that
 * collects a name and writes to IndexedDB.
 */
import { circuit, showToast } from "./store";
import { saveCircuit } from "../gallery/store";
import { circuitToThumbnailSvg } from "../gallery/thumbnail";

export function mountSaveToGallery(root: HTMLElement): void {
  const btn = root.querySelector<HTMLButtonElement>('[data-action="save-gallery"]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-role="save-dialog"]');
  const form = root.querySelector<HTMLFormElement>('[data-role="save-form"]');
  const nameInput = root.querySelector<HTMLInputElement>('[data-role="save-name"]');
  const cancelBtn = root.querySelector<HTMLButtonElement>('[data-role="save-cancel"]');

  if (!btn || !dialog || !form || !nameInput || !cancelBtn) {
    console.warn("[gallery-save] missing required elements; skipping mount");
    return;
  }

  btn.addEventListener("click", () => {
    // Suggest a sensible default name
    const c = circuit.value;
    const ts = new Date().toLocaleString();
    nameInput.value = `Circuit ${c.qubits}q · ${ts}`;
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      // Fallback for older browsers — toggle hidden attribute
      dialog.removeAttribute("hidden");
    }
    setTimeout(() => nameInput.select(), 0);
  });

  cancelBtn.addEventListener("click", () => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.setAttribute("hidden", "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      showToast("Give your circuit a name first.", "error");
      return;
    }
    try {
      const c = circuit.value;
      const thumb = circuitToThumbnailSvg(c);
      await saveCircuit(c, name, thumb);
      showToast(`Saved “${name}” to gallery.`, "info");
      if (typeof dialog.close === "function") dialog.close();
      else dialog.setAttribute("hidden", "");
    } catch (err) {
      console.error(err);
      showToast("Couldn't save — your browser blocked storage.", "error");
    }
  });
}
