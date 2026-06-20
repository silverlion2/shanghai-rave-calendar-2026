(function initCollapsibleSearch(win) {
  if (!win || !win.document) return;

  const doc = win.document;
  const SEARCH_SELECTOR = 'input[type="search"]:not([data-collapsible-search-skip])';
  const CONTAINER_SELECTOR = ".controls, .wall-controls, .wall-tools, .contribution-target-tools";
  const FIELD_SELECTOR = "label, .field-stack";

  function labelTextFor(input) {
    const explicit = input.getAttribute("aria-label");
    if (explicit) return explicit;
    const field = input.closest(FIELD_SELECTOR);
    const labelSpan = field && field.querySelector("span");
    const text = (labelSpan && labelSpan.textContent || input.placeholder || "Search").trim();
    return text || "Search";
  }

  function syncState(wrapper, input) {
    const hasValue = Boolean(input.value.trim());
    const isActive = doc.activeElement === input;
    wrapper.classList.toggle("has-value", hasValue);
    wrapper.classList.toggle("is-open", hasValue || isActive || wrapper.dataset.open === "true");
  }

  function openSearch(wrapper, input) {
    wrapper.dataset.open = "true";
    syncState(wrapper, input);
    input.focus({ preventScroll: true });
    input.select();
  }

  function closeSearch(wrapper, input) {
    if (input.value.trim()) {
      syncState(wrapper, input);
      return;
    }
    wrapper.dataset.open = "false";
    syncState(wrapper, input);
  }

  function enhance(input) {
    if (!input || input.dataset.collapsibleSearch === "ready") return;
    if (input.closest(".collapsible-search")) return;

    const label = labelTextFor(input);
    input.dataset.collapsibleSearch = "ready";
    input.classList.add("collapsible-search-input");
    if (!input.getAttribute("aria-label")) input.setAttribute("aria-label", label);

    const wrapper = doc.createElement("span");
    wrapper.className = "collapsible-search";
    wrapper.dataset.open = input.value.trim() ? "true" : "false";

    const button = doc.createElement("button");
    button.type = "button";
    button.className = "collapsible-search-toggle";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.innerHTML = '<span class="collapsible-search-icon" aria-hidden="true"></span>';

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(button, input);

    const field = wrapper.closest(FIELD_SELECTOR);
    if (field) field.classList.add("collapsible-search-field");

    const container = wrapper.closest(CONTAINER_SELECTOR);
    if (container) container.classList.add("has-collapsible-search");

    button.addEventListener("click", event => {
      event.preventDefault();
      if (wrapper.classList.contains("is-open") && !input.value.trim() && doc.activeElement !== input) {
        closeSearch(wrapper, input);
        return;
      }
      openSearch(wrapper, input);
    });

    input.addEventListener("focus", () => openSearch(wrapper, input));
    input.addEventListener("input", () => syncState(wrapper, input));
    input.addEventListener("blur", () => {
      win.setTimeout(() => closeSearch(wrapper, input), 80);
    });
    input.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (input.value) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      closeSearch(wrapper, input);
      button.focus({ preventScroll: true });
    });

    syncState(wrapper, input);
  }

  function enhanceAll(root = doc) {
    root.querySelectorAll(SEARCH_SELECTOR).forEach(enhance);
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", () => enhanceAll(), { once: true });
  } else {
    enhanceAll();
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (!node || node.nodeType !== 1) return;
        if (node.matches && node.matches(SEARCH_SELECTOR)) enhance(node);
        if (node.querySelectorAll) enhanceAll(node);
      });
    }
  });
  observer.observe(doc.documentElement, { childList: true, subtree: true });

  win.CollapsibleSearch = { enhanceAll };
})(typeof window !== "undefined" ? window : null);
