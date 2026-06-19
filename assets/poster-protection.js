(function () {
  "use strict";

  if (typeof document === "undefined" || window.RavePosterProtection) return;

  const posterImageSelector = [
    "img[data-poster-protected]",
    "img[src*='assets/posters/']",
    "img[src*='/assets/posters/']",
    ".poster img",
    ".wall-card-poster img",
    ".poster-strip-card img",
    ".archive-poster img",
    ".event-hero figure img",
    ".hero-picture img",
    "#modalPoster",
    "#modalImage"
  ].join(",");

  const posterSurfaceSelector = [
    "[data-poster-protected]",
    ".poster",
    ".wall-card-poster",
    ".poster-strip-card",
    ".archive-poster",
    ".event-hero figure",
    ".hero-picture",
    ".modal.has-event-poster .modal-hero",
    "#posterModal",
    "#eventModal"
  ].join(",");

  function isPosterUrl(value) {
    return /(?:^|\/)assets\/posters\//i.test(String(value || ""));
  }

  function protectedImageFromTarget(target) {
    if (!target || target.nodeType !== 1) return null;
    if (target.matches && target.matches(posterImageSelector)) return target;
    const image = target.closest && target.closest(posterImageSelector);
    if (image) return image;
    const surface = target.closest && target.closest(posterSurfaceSelector);
    if (!surface) return null;
    return surface.querySelector && surface.querySelector(posterImageSelector);
  }

  function protectImage(image) {
    if (!image || image.nodeType !== 1) return;
    const src = image.currentSrc || image.getAttribute("src") || "";
    if (!isPosterUrl(src) && !image.matches(posterImageSelector)) return;
    image.dataset.posterProtected = "true";
    image.setAttribute("draggable", "false");
    image.setAttribute("aria-describedby", image.getAttribute("aria-describedby") || "poster-download-policy");
  }

  function protectTree(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(posterImageSelector).forEach(protectImage);
  }

  function blockPosterEvent(event) {
    if (!protectedImageFromTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function blockPosterKeyboardSave(event) {
    const key = String(event.key || "").toLowerCase();
    if (!(event.ctrlKey || event.metaKey) || key !== "s") return;
    if (!protectedImageFromTarget(document.activeElement)) return;
    event.preventDefault();
  }

  document.addEventListener("contextmenu", blockPosterEvent, true);
  document.addEventListener("dragstart", blockPosterEvent, true);
  document.addEventListener("selectstart", blockPosterEvent, true);
  document.addEventListener("copy", blockPosterEvent, true);
  document.addEventListener("keydown", blockPosterKeyboardSave, true);

  const policy = document.createElement("span");
  policy.id = "poster-download-policy";
  policy.hidden = true;
  policy.textContent = "Poster download disabled.";

  function boot() {
    if (!document.getElementById(policy.id)) document.body.appendChild(policy);
    protectTree(document);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) protectTree(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.RavePosterProtection = {
    protectTree,
    protectImage,
  };
})();
