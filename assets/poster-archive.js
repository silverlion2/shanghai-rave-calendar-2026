(function () {
  const state = {
    archive: null,
    posters: [],
    query: "",
    year: "all",
    venue: "all",
    tag: "all",
    sort: "newest",
  };

  const els = {};

  function boot() {
    bindElements();
    bindControls();
    loadArchive();
  }

  function bindElements() {
    [
      "archiveGrid",
      "archiveEmpty",
      "archiveStatus",
      "statPosters",
      "statPayload",
      "statCoverage",
      "statVenues",
      "budgetFill",
      "budgetText",
      "searchInput",
      "yearFilter",
      "venueFilter",
      "tagFilter",
      "sortFilter",
      "modal",
      "modalImage",
      "modalTitle",
      "modalMeta",
      "modalNotes",
      "modalTags",
      "modalSource",
      "modalEvent",
      "modalClose",
      "modalBack",
    ].forEach(id => {
      els[id] = document.getElementById(id);
    });
  }

  function bindControls() {
    const updateFromControl = () => {
      state.query = els.searchInput.value.trim().toLowerCase();
      state.year = els.yearFilter.value;
      state.venue = els.venueFilter.value;
      state.tag = els.tagFilter.value;
      state.sort = els.sortFilter.value;
      render();
    };

    [els.searchInput, els.yearFilter, els.venueFilter, els.tagFilter, els.sortFilter].forEach(control => {
      control.addEventListener("input", updateFromControl);
      control.addEventListener("change", updateFromControl);
    });

    [els.modalClose, els.modalBack].forEach(button => button.addEventListener("click", closeModal));
    els.modal.addEventListener("click", event => {
      if (event.target === els.modal) closeModal();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeModal();
    });
  }

  async function loadArchive() {
    try {
      const response = await fetch("data/poster-archive.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.archive = await response.json();
      state.posters = Array.isArray(state.archive.posters) ? state.archive.posters : [];
      hydrateFilters();
      render();
    } catch (error) {
      els.archiveStatus.textContent = `Archive data unavailable: ${error.message}`;
      els.archiveGrid.innerHTML = "";
      els.archiveEmpty.hidden = false;
    }
  }

  function hydrateFilters() {
    fillSelect(els.yearFilter, ["all", ...unique(state.posters.map(poster => poster.year).filter(Boolean)).sort((a, b) => b - a)], "All years");
    fillSelect(els.venueFilter, ["all", ...unique(state.posters.map(poster => poster.venue).filter(Boolean)).sort()], "All venues");
    fillSelect(els.tagFilter, ["all", ...unique(state.posters.flatMap(poster => poster.tags || [])).sort()], "All tags");
  }

  function fillSelect(select, values, allLabel) {
    select.innerHTML = values.map(value => {
      const label = value === "all" ? allLabel : value;
      return `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`;
    }).join("");
  }

  function render() {
    renderStats();
    const posters = filteredPosters();
    els.archiveStatus.textContent = `${posters.length} poster${posters.length === 1 ? "" : "s"} in view`;
    els.archiveEmpty.hidden = posters.length > 0;
    els.archiveGrid.innerHTML = posters.map(renderPosterCard).join("");
    els.archiveGrid.querySelectorAll("[data-poster-id]").forEach(card => {
      card.addEventListener("click", () => openModal(card.dataset.posterId));
      card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openModal(card.dataset.posterId);
        }
      });
    });
  }

  function renderStats() {
    const stats = state.archive?.stats || {};
    const softCap = stats.freeTierSoftCapBytes || 1;
    const displayBytes = stats.displayBytes || 0;
    const sourceBytes = stats.sourceBytes || 0;
    const fill = Math.min(100, Math.round((displayBytes / softCap) * 100));

    els.statPosters.textContent = stats.posters || state.posters.length || 0;
    els.statPayload.textContent = formatMB(displayBytes);
    els.statCoverage.textContent = `${stats.optimizedCount || 0}/${stats.posters || 0}`;
    els.statVenues.textContent = stats.venues || unique(state.posters.map(poster => poster.venue)).length || 0;
    els.budgetFill.style.width = `${Math.max(fill, 2)}%`;
    els.budgetText.textContent = `${formatMB(displayBytes)} display / ${formatMB(sourceBytes)} raw source / ${stats.freeTierSoftCapMegabytes || 80} MB soft cap`;
  }

  function filteredPosters() {
    const result = state.posters.filter(poster => {
      if (state.year !== "all" && String(poster.year) !== state.year) return false;
      if (state.venue !== "all" && poster.venue !== state.venue) return false;
      if (state.tag !== "all" && !(poster.tags || []).includes(state.tag)) return false;
      if (state.query && !searchable(poster).includes(state.query)) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (state.sort === "oldest") return String(a.sortDate).localeCompare(String(b.sortDate));
      if (state.sort === "title") return String(a.title).localeCompare(String(b.title));
      if (state.sort === "venue") return String(a.venue).localeCompare(String(b.venue)) || String(b.sortDate).localeCompare(String(a.sortDate));
      return String(b.sortDate).localeCompare(String(a.sortDate));
    });
  }

  function renderPosterCard(poster) {
    const image = poster.image || {};
    return `
      <article class="archive-card" data-poster-id="${escapeAttr(poster.id)}" tabindex="0" role="button" aria-label="${escapeAttr(poster.title)}">
        <figure class="archive-poster">
          <img src="${escapeAttr(image.thumbnail || image.display)}" alt="${escapeAttr(`${poster.title} rave poster`)}" loading="lazy" decoding="async">
          <figcaption>
            <span>${escapeHtml(poster.year || "")}</span>
            <b>${escapeHtml(poster.venue || "Shanghai")}</b>
          </figcaption>
        </figure>
        <div class="archive-card-body">
          <div class="archive-card-meta"><span>${escapeHtml(poster.date || "")}</span><span>${escapeHtml(formatMB(image.displayBytes || 0))}</span></div>
          <h2>${escapeHtml(poster.title)}</h2>
          <p>${escapeHtml(poster.sound || poster.collection || "")}</p>
          <div class="tag-row">
            ${(poster.tags || []).slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>
      </article>
    `;
  }

  function openModal(id) {
    const poster = state.posters.find(item => item.id === id);
    if (!poster) return;
    const image = poster.image || {};
    const source = poster.source || {};

    els.modalImage.src = image.display || image.thumbnail || "";
    els.modalImage.alt = `${poster.title} rave poster`;
    els.modalTitle.textContent = poster.title;
    els.modalMeta.innerHTML = [
      ["Date", `${poster.date || ""} ${poster.time || ""}`.trim()],
      ["Venue", [poster.venue, poster.district].filter(Boolean).join(" / ")],
      ["Sound", poster.sound || "electronic"],
      ["Asset", `${formatMB(image.displayBytes || 0)} display / ${image.optimized ? "optimized" : "source"}`],
      ["Evidence", source.posterEvidenceSource || source.label || "source logged"],
    ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value || "Not listed")}</b></div>`).join("");
    els.modalNotes.textContent = poster.notes || "";
    els.modalTags.innerHTML = (poster.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
    setLink(els.modalSource, source.url || source.posterEvidenceUrl);
    setLink(els.modalEvent, poster.eventUrl);
    els.modal.classList.add("open");
  }

  function closeModal() {
    els.modal.classList.remove("open");
  }

  function setLink(link, href) {
    if (!href) {
      link.hidden = true;
      link.removeAttribute("href");
      return;
    }
    link.hidden = false;
    link.href = href;
  }

  function searchable(poster) {
    return [
      poster.title,
      poster.year,
      poster.date,
      poster.venue,
      poster.district,
      poster.city,
      poster.sound,
      poster.collection,
      ...(poster.tags || []),
    ].join(" ").toLowerCase();
  }

  function unique(values) {
    return [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim()))];
  }

  function formatMB(bytes) {
    return `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", boot);
  }

  if (typeof module !== "undefined") {
    module.exports = { filteredPosters, searchable, formatMB };
  }
}());
