(function initCommunityContributions(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RaveCommunityContributions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function communityContributionFactory() {
  const STORAGE_KEY = "basement-dispatch-community-contributions-v1";
  const MAX_LOCAL_ROWS = 50;
  let localIdCounter = 0;
  const TYPE_ROWS = [
    ["event", "Event lead", "Missing party, lineup, ticket, time, or poster evidence"],
    ["dj", "DJ profile", "Artist source, alias, sound lane, or tour stop"],
    ["venue", "Venue detail", "Room, address, policy, social account, or recurring night"],
    ["source-fix", "Source fix", "Broken link, stronger source, updated ticket route, or correction"],
  ];
  const TYPE_VALUES = TYPE_ROWS.map(row => row[0]);
  const MODE_ROWS = [
    ["new", "New lead", "Submit a missing event, DJ, venue, or source"],
    ["existing", "Add to existing", "Attach stronger facts to an entry already listed"],
  ];
  const TARGET_ROWS = [
    ["event", "Event"],
    ["dj", "DJ"],
    ["venue", "Venue"],
  ];
  const TARGET_VALUES = TARGET_ROWS.map(row => row[0]);
  const ROLE_ROWS = [
    ["community", "Community member"],
    ["promoter", "Promoter / organiser"],
    ["venue", "Venue team"],
    ["artist", "DJ / artist"],
    ["ticketing", "Ticketing / source"],
  ];
  const ROLE_VALUES = ROLE_ROWS.map(row => row[0]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function cleanText(value, limit = 400) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, limit);
  }

  function normalizeContributionType(value) {
    const type = cleanText(value, 32).toLowerCase();
    return TYPE_VALUES.includes(type) ? type : "event";
  }

  function normalizeContributionMode(value) {
    return cleanText(value, 32).toLowerCase() === "existing" ? "existing" : "new";
  }

  function normalizeTargetKind(value) {
    const kind = cleanText(value, 32).toLowerCase();
    return TARGET_VALUES.includes(kind) ? kind : "event";
  }

  function normalizeContributorRole(value) {
    const role = cleanText(value, 32).toLowerCase();
    return ROLE_VALUES.includes(role) ? role : "community";
  }

  function slugValue(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "entry";
  }

  function targetKey(option) {
    if (!option) return "";
    return [
      option.kind,
      encodeURIComponent(option.id),
      encodeURIComponent(option.label),
    ].join("::");
  }

  function parseTargetKey(value) {
    const parts = cleanText(value, 600).split("::");
    if (parts.length !== 3 || !TARGET_VALUES.includes(parts[0])) return null;
    try {
      return {
        targetKind: parts[0],
        targetId: cleanText(decodeURIComponent(parts[1]), 160),
        targetLabel: cleanText(decodeURIComponent(parts[2]), 240),
      };
    } catch (_) {
      return null;
    }
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function optionSearchText(values) {
    return cleanText(values.filter(Boolean).join(" "), 800).toLowerCase();
  }

  function pluralCount(count, singular) {
    return `${count} ${singular}${count === 1 ? "" : "s"}`;
  }

  function entryOptionsFromData(sourceData = {}) {
    const events = asArray(sourceData.events);
    const eventOptions = events
      .filter(event => event && cleanText(event.title, 160))
      .map(event => {
        const date = cleanText(event.sortDate || event.date, 40);
        const venue = cleanText(event.venue, 120);
        const district = cleanText(event.district, 80);
        const label = cleanText([
          event.title,
          date,
          venue,
        ].filter(Boolean).join(" / "), 240);
        return {
          kind: "event",
          id: cleanText(event.id, 160) || slugValue(`${event.title}-${date || venue}`),
          label,
          sort: date || label,
          search: optionSearchText([event.id, event.title, date, venue, district, event.genre]),
        };
      })
      .sort((a, b) => b.sort.localeCompare(a.sort) || a.label.localeCompare(b.label));

    const djMap = new Map();
    function addDjName(value, eventId = "") {
      const name = cleanText(typeof value === "string" ? value : value && value.name, 120);
      if (!name) return;
      const key = name.toLowerCase();
      const row = djMap.get(key) || {
        name,
        count: 0,
        events: new Set(),
      };
      row.count += 1;
      if (eventId) row.events.add(eventId);
      djMap.set(key, row);
    }

    Object.entries(sourceData.lineups || {}).forEach(([eventId, lineup]) => {
      asArray(lineup).forEach(artist => addDjName(artist, eventId));
    });
    events.forEach(event => {
      const eventId = cleanText(event && event.id, 160);
      asArray(event && event.lineup).forEach(artist => addDjName(artist, eventId));
      asArray(event && event.setTimes).forEach(slot => addDjName(slot && (slot.artist || slot.name), eventId));
    });

    const djOptions = Array.from(djMap.values())
      .map(row => ({
        kind: "dj",
        id: slugValue(row.name),
        label: row.count > 1 ? `${row.name} / ${pluralCount(row.count, "listing")}` : row.name,
        sort: row.name.toLowerCase(),
        search: optionSearchText([row.name, ...Array.from(row.events)]),
      }))
      .sort((a, b) => a.sort.localeCompare(b.sort));

    const venueMap = new Map();
    function addVenueName(nameValue, districtValue = "") {
      const name = cleanText(nameValue, 120);
      if (!name) return;
      const key = name.toLowerCase();
      const row = venueMap.get(key) || {
        name,
        count: 0,
        districts: new Set(),
      };
      row.count += 1;
      const district = cleanText(districtValue, 80);
      if (district) row.districts.add(district);
      venueMap.set(key, row);
    }

    events.forEach(event => addVenueName(event && event.venue, event && event.district));
    asArray(sourceData.venueCoverage).forEach(venue => addVenueName(
      venue && (venue.venue || venue.name),
      venue && (venue.district || venue.area)
    ));

    const venueOptions = Array.from(venueMap.values())
      .map(row => {
        const district = Array.from(row.districts)[0] || "";
        return {
          kind: "venue",
          id: slugValue(row.name),
          label: cleanText([
            row.name,
            district,
            pluralCount(row.count, "listing"),
          ].filter(Boolean).join(" / "), 240),
          sort: row.name.toLowerCase(),
          search: optionSearchText([row.name, district, row.count]),
        };
      })
      .sort((a, b) => a.sort.localeCompare(b.sort));

    return {
      event: eventOptions,
      dj: djOptions,
      venue: venueOptions,
    };
  }

  function selectedTargetFromPayload(payload = {}, mode = normalizeContributionMode(payload.contributionMode || payload.mode)) {
    if (mode !== "existing") {
      return {
        targetKind: "new",
        targetId: "",
        targetLabel: "",
      };
    }

    const picked = parseTargetKey(payload.targetPick);
    const targetKind = normalizeTargetKind(payload.targetKind || picked?.targetKind);
    const targetId = cleanText(payload.targetId || picked?.targetId, 160);
    const targetLabel = cleanText(payload.targetLabel || picked?.targetLabel, 240);

    if (!targetId || !targetLabel) {
      throw new Error("Choose the existing event, DJ, or venue entry to enrich.");
    }

    return {
      targetKind,
      targetId,
      targetLabel,
    };
  }

  function normalizeUrl(value) {
    const text = cleanText(value, 500);
    if (!text) return "";
    let parsed;
    try {
      parsed = new URL(text);
    } catch (_) {
      throw new Error("Source URL must be a valid http or https link.");
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Source URL must start with http:// or https://.");
    }
    return parsed.href;
  }

  function consentValue(value) {
    return value === true || value === "true" || value === "on" || value === "yes";
  }

  function nextLocalId() {
    localIdCounter = (localIdCounter + 1) % 1000000;
    return `local-${Date.now().toString(36)}-${localIdCounter.toString(36)}`;
  }

  function recordFromPayload(payload = {}) {
    const contributionMode = normalizeContributionMode(payload.contributionMode || payload.mode);
    const target = selectedTargetFromPayload(payload, contributionMode);
    const type = normalizeContributionType(payload.contributionType || payload.type);
    const contributorRole = normalizeContributorRole(payload.contributorRole);
    const title = cleanText(payload.title || target.targetLabel, 120);
    const sourceUrl = normalizeUrl(payload.sourceUrl);
    const sourceNote = cleanText(payload.sourceNote, 240);
    const details = cleanText(payload.details, 3000);
    const consent = consentValue(payload.consent);

    if (title.length < 2) throw new Error("Add a specific event, DJ, venue, or source title.");
    if (!sourceUrl && sourceNote.length < 3) throw new Error("Add a source URL or a short source note.");
    if (details.length < 20) throw new Error("Add at least 20 characters of source-backed detail.");
    if (!consent) throw new Error("Confirm this can be reviewed and merged by the Basement Dispatch editors.");

    return {
      id: cleanText(payload.id, 80) || nextLocalId(),
      contributionMode,
      targetKind: target.targetKind,
      targetId: target.targetId,
      targetLabel: target.targetLabel,
      contributionType: type,
      contributorRole,
      affiliation: cleanText(payload.affiliation, 160),
      title,
      eventDate: cleanText(payload.eventDate, 20),
      venueName: cleanText(payload.venueName, 120),
      city: cleanText(payload.city, 80) || "Shanghai",
      sourceUrl,
      sourceNote,
      details,
      contact: cleanText(payload.contact, 160),
      consent,
      status: "pending",
      createdAt: cleanText(payload.createdAt, 40) || new Date().toISOString(),
    };
  }

  function recordFromForm(form) {
    const data = new FormData(form);
    return recordFromPayload({
      contributionMode: data.get("contributionMode"),
      targetKind: data.get("targetKind"),
      targetId: data.get("targetId"),
      targetLabel: data.get("targetLabel"),
      targetPick: data.get("targetPick"),
      contributionType: data.get("contributionType"),
      contributorRole: data.get("contributorRole"),
      affiliation: data.get("affiliation"),
      title: data.get("title"),
      eventDate: data.get("eventDate"),
      venueName: data.get("venueName"),
      city: data.get("city"),
      sourceUrl: data.get("sourceUrl"),
      sourceNote: data.get("sourceNote"),
      details: data.get("details"),
      contact: data.get("contact"),
      consent: data.get("consent"),
    });
  }

  function readContributions(win) {
    try {
      const rows = JSON.parse(win.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows.map(row => recordFromPayload({ ...row, consent: true })).slice(0, MAX_LOCAL_ROWS) : [];
    } catch (_) {
      return [];
    }
  }

  function writeContribution(win, record) {
    if (!win || !win.localStorage) return [];
    const rows = readContributions(win);
    const next = [record, ...rows.filter(row => row.id !== record.id)].slice(0, MAX_LOCAL_ROWS);
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function contributionConfig(win) {
    const source = win && (win.COMMUNITY_SUPABASE || win.LOVE_WALL_SUPABASE) || {};
    return {
      enabled: source.enabled !== false,
      url: String(source.url || "").replace(/\/+$/, ""),
      anonKey: String(source.anonKey || ""),
      table: source.contributionTable || "community_contributions",
    };
  }

  function canUseSupabase(win, config = contributionConfig(win)) {
    return Boolean(
      win
      && win.supabase
      && typeof win.supabase.createClient === "function"
      && config.enabled
      && /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(config.url)
      && config.anonKey.length > 20
    );
  }

  function contributionAccessState({ win, config, supabaseGlobal } = {}) {
    const resolvedConfig = config || contributionConfig(win);
    const hasClient = Boolean(supabaseGlobal || (win && win.supabase));
    if (!resolvedConfig.enabled) return { mode: "local", label: "Local queue" };
    if (!resolvedConfig.url || !resolvedConfig.anonKey) return { mode: "local", label: "Supabase config missing" };
    if (!hasClient) return { mode: "local", label: "Supabase client missing" };
    return { mode: "remote", label: "Review queue ready" };
  }

  async function insertRemote(win, record) {
    const config = contributionConfig(win);
    if (!canUseSupabase(win, config)) {
      return { ok: false, skipped: true, message: "Supabase is not configured for community contributions yet." };
    }
    const client = win.supabase.createClient(config.url, config.anonKey);
    let submittedBy = null;
    try {
      const sessionResult = client.auth && typeof client.auth.getSession === "function"
        ? await client.auth.getSession()
        : null;
      submittedBy = sessionResult?.data?.session?.user?.id || null;
    } catch (_) {
      submittedBy = null;
    }
    const row = remoteRowFromRecord(record, submittedBy);
    const result = await client.from(config.table).insert(row).select("id").maybeSingle();
    if (result.error) return { ok: false, message: result.error.message };
    return { ok: true, id: result.data?.id || "" };
  }

  function remoteRowFromRecord(record, submittedBy = null) {
    return {
      contribution_type: record.contributionType,
      contributor_role: record.contributorRole || "community",
      affiliation: record.affiliation || null,
      target_kind: record.targetKind || "new",
      target_id: record.targetId || null,
      target_label: record.targetLabel || null,
      title: record.title,
      event_date: record.eventDate || null,
      venue_name: record.venueName || null,
      city: record.city || "Shanghai",
      source_url: record.sourceUrl || null,
      source_note: record.sourceNote || null,
      details: record.details,
      contact_method: record.contact || null,
      status: "pending",
      source: "contribute_page",
      consent: record.consent,
      submitted_by: submittedBy,
      metadata: {
        createdLocalAt: record.createdAt,
        contributionMode: record.contributionMode || "new",
        contributorRole: record.contributorRole || "community",
        affiliation: record.affiliation || null,
        target: record.targetKind && record.targetKind !== "new"
          ? {
            kind: record.targetKind,
            id: record.targetId,
            label: record.targetLabel,
          }
          : null,
        page: "contribute.html",
      },
    };
  }

  function renderModeChoices() {
    return MODE_ROWS.map(([value, label, helper], index) => `
      <label class="contribution-mode-chip">
        <input type="radio" name="contributionMode" value="${escapeHtml(value)}" ${index === 0 ? "checked" : ""}>
        <span>
          <b>${escapeHtml(label)}</b>
          <em>${escapeHtml(helper)}</em>
        </span>
      </label>
    `).join("");
  }

  function renderTypeChoices() {
    return TYPE_ROWS.map(([value, label, helper], index) => `
      <label class="contribution-type-chip">
        <input type="radio" name="contributionType" value="${escapeHtml(value)}" ${index === 0 ? "checked" : ""}>
        <span>
          <b>${escapeHtml(label)}</b>
          <em>${escapeHtml(helper)}</em>
        </span>
      </label>
    `).join("");
  }

  function renderTargetKindChoices() {
    return TARGET_ROWS.map(([value, label], index) => `
      <label class="contribution-target-kind">
        <input type="radio" name="targetKindChoice" value="${escapeHtml(value)}" ${index === 0 ? "checked" : ""}>
        <span>${escapeHtml(label)}</span>
      </label>
    `).join("");
  }

  function renderRoleChoices() {
    return ROLE_ROWS.map(([value, label]) => `
      <option value="${escapeHtml(value)}">${escapeHtml(label)}</option>
    `).join("");
  }

  function renderForm(mount) {
    mount.innerHTML = `
      <form class="contribution-form" data-community-contribution-form>
        <fieldset class="contribution-mode-grid">
          <legend>Contribution mode</legend>
          ${renderModeChoices()}
        </fieldset>
        <fieldset class="contribution-type-grid">
          <legend>Contribution type</legend>
          ${renderTypeChoices()}
        </fieldset>
        <section class="contribution-target-panel" data-community-target-panel hidden>
          <div class="contribution-target-copy">
            <b>Pick the entry to enrich</b>
            <span>Reviewers will see this target separately from your evidence notes.</span>
          </div>
          <fieldset class="contribution-target-kind-grid">
            <legend>Existing entry type</legend>
            ${renderTargetKindChoices()}
          </fieldset>
          <div class="contribution-target-tools">
            <label class="contribution-field">
              <span>Search entry</span>
              <input class="contribution-input" type="search" data-community-target-search autocomplete="off" placeholder="Search current events, DJs, or venues">
            </label>
            <label class="contribution-field">
              <span>Selected entry</span>
              <select class="contribution-select" name="targetPick" data-community-target-select></select>
            </label>
          </div>
          <input type="hidden" name="targetKind" data-community-target-kind value="event">
          <input type="hidden" name="targetId" data-community-target-id>
          <input type="hidden" name="targetLabel" data-community-target-label>
          <p class="contribution-target-summary" data-community-target-summary>Current entries load from the public database bundle.</p>
        </section>
        <div class="contribution-grid">
          <label class="contribution-field">
            <span>Contributor role</span>
            <select class="contribution-select" name="contributorRole">
              ${renderRoleChoices()}
            </select>
          </label>
          <label class="contribution-field">
            <span>Affiliation</span>
            <input class="contribution-input" name="affiliation" type="text" maxlength="160" autocomplete="organization" placeholder="Optional: promoter, venue, crew, artist alias">
          </label>
          <label class="contribution-field span-2">
            <span>Title</span>
            <input class="contribution-input" name="title" type="text" maxlength="120" autocomplete="off" placeholder="Event, DJ, venue, or source name" required>
          </label>
          <label class="contribution-field">
            <span>Date</span>
            <input class="contribution-input" name="eventDate" type="date">
          </label>
          <label class="contribution-field">
            <span>City</span>
            <input class="contribution-input" name="city" type="text" maxlength="80" value="Shanghai" autocomplete="address-level2">
          </label>
          <label class="contribution-field span-2">
            <span>Venue or room</span>
            <input class="contribution-input" name="venueName" type="text" maxlength="120" autocomplete="off" placeholder="POTENT, Heim, Abyss, System, rooftop, warehouse">
          </label>
          <label class="contribution-field span-2">
            <span>Source URL</span>
            <input class="contribution-input" name="sourceUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://">
          </label>
          <label class="contribution-field span-2">
            <span>Source note</span>
            <input class="contribution-input" name="sourceNote" type="text" maxlength="240" autocomplete="off" placeholder="Official WeChat post, Xiaohongshu account, poster photo, ticket mini-program">
          </label>
          <label class="contribution-field span-2">
            <span>Details</span>
            <textarea class="contribution-textarea" name="details" maxlength="3000" required placeholder="What should be added or corrected? Include lineup, time, ticket state, address, source date, or why this source is stronger."></textarea>
          </label>
          <label class="contribution-field span-2">
            <span>Contact</span>
            <input class="contribution-input" name="contact" type="text" maxlength="160" autocomplete="off" placeholder="Optional: RED, email, Instagram, WeChat">
          </label>
        </div>
        <label class="contribution-consent">
          <input name="consent" type="checkbox" required>
          <span>I understand this enters a moderated source queue and will not publish until reviewed.</span>
        </label>
        <div class="contribution-actions">
          <button class="contribution-submit" type="submit">Submit to review queue</button>
          <button class="contribution-secondary" type="button" data-community-export>Export local queue</button>
        </div>
      </form>
      <div class="contribution-status" data-community-contribution-status>
        <strong>Queue empty.</strong> Source-backed additions land here before editor review.
      </div>
      <div class="contribution-local-list" data-community-local-list></div>
    `;
  }

  function queueSummary(rows) {
    if (!rows.length) return "";
    return rows.slice(0, 4).map(row => `
      <article class="contribution-local-row">
        <span>${escapeHtml(row.targetKind === "new" ? row.contributionType.replace("-", " ") : `add ${row.targetKind}`)}</span>
        <b>${escapeHtml(row.title)}</b>
        <em>${escapeHtml(row.createdAt.slice(0, 10))}</em>
      </article>
    `).join("");
  }

  function renderLocalQueue(mount, win) {
    const list = mount.querySelector("[data-community-local-list]");
    if (!list) return;
    const rows = readContributions(win);
    list.innerHTML = rows.length
      ? `<div class="contribution-local-head"><b>${rows.length}</b><span>saved in this browser</span></div>${queueSummary(rows)}`
      : "";
  }

  function remoteStatusText(record, remote) {
    const remoteText = remote.ok
      ? `Remote review row saved${remote.id ? ` (${remote.id})` : ""}.`
      : remote.skipped
        ? "Saved locally; remote queue is not configured yet."
        : `Saved locally; remote queue failed: ${remote.message}`;
    return `<strong>${escapeHtml(record.title)} queued.</strong> ${escapeHtml(remoteText)}`;
  }

  function exportLocalQueue(win) {
    const rows = readContributions(win);
    const payload = {
      exportedAt: new Date().toISOString(),
      rows,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = win.document.createElement("a");
    link.href = url;
    link.download = "basement-dispatch-community-contributions.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function bindTargetControls(form, win) {
    const panel = form.querySelector("[data-community-target-panel]");
    const search = form.querySelector("[data-community-target-search]");
    const select = form.querySelector("[data-community-target-select]");
    const kindInput = form.querySelector("[data-community-target-kind]");
    const idInput = form.querySelector("[data-community-target-id]");
    const labelInput = form.querySelector("[data-community-target-label]");
    const summary = form.querySelector("[data-community-target-summary]");
    const titleInput = form.querySelector('[name="title"]');
    const options = entryOptionsFromData(win && win.DJ_SOURCE_DATA || {});

    function selectedMode() {
      const checked = form.querySelector('[name="contributionMode"]:checked');
      return normalizeContributionMode(checked && checked.value);
    }

    function selectedKind() {
      const checked = form.querySelector('[name="targetKindChoice"]:checked');
      return normalizeTargetKind(checked && checked.value);
    }

    function updateHiddenFromSelect() {
      const parsed = parseTargetKey(select.value);
      if (!parsed) {
        idInput.value = "";
        labelInput.value = "";
        kindInput.value = selectedKind();
        return;
      }
      kindInput.value = parsed.targetKind;
      idInput.value = parsed.targetId;
      labelInput.value = parsed.targetLabel;
    }

    function filteredOptions(kind) {
      const query = cleanText(search.value, 120).toLowerCase();
      const rows = options[kind] || [];
      return rows
        .filter(row => !query || row.search.includes(query) || row.label.toLowerCase().includes(query))
        .slice(0, 120);
    }

    function renderOptions() {
      const kind = selectedKind();
      const rows = filteredOptions(kind);
      kindInput.value = kind;
      if (!rows.length) {
        select.innerHTML = `<option value="">No ${escapeHtml(kind)} entries found</option>`;
        updateHiddenFromSelect();
        summary.textContent = `No ${kind} entries match the current search.`;
        return;
      }
      select.innerHTML = rows.map(row => `<option value="${escapeHtml(targetKey(row))}">${escapeHtml(row.label)}</option>`).join("");
      updateHiddenFromSelect();
      const total = options[kind] ? options[kind].length : rows.length;
      summary.textContent = `${rows.length} of ${total} ${kind} entries available from the current public bundle.`;
    }

    function sync() {
      const existingMode = selectedMode() === "existing";
      panel.hidden = !existingMode;
      select.required = existingMode;
      if (titleInput) {
        titleInput.required = !existingMode;
        titleInput.placeholder = existingMode
          ? "Optional: short label for the addition"
          : "Event, DJ, venue, or source name";
      }
      renderOptions();
    }

    form.querySelectorAll('[name="contributionMode"]').forEach(input => input.addEventListener("change", sync));
    form.querySelectorAll('[name="targetKindChoice"]').forEach(input => input.addEventListener("change", renderOptions));
    search.addEventListener("input", renderOptions);
    select.addEventListener("change", updateHiddenFromSelect);
    sync();
    return sync;
  }

  function bind(mount, win) {
    renderForm(mount);
    renderLocalQueue(mount, win);
    const form = mount.querySelector("[data-community-contribution-form]");
    const status = mount.querySelector("[data-community-contribution-status]");
    const exportButton = mount.querySelector("[data-community-export]");
    const syncTargetControls = bindTargetControls(form, win);
    const access = contributionAccessState({ win, supabaseGlobal: win && win.supabase });
    status.innerHTML = `<strong>${escapeHtml(access.label)}.</strong> Contributions are saved locally before remote review.`;

    exportButton.addEventListener("click", () => exportLocalQueue(win));
    form.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const record = recordFromForm(form);
        writeContribution(win, record);
        renderLocalQueue(mount, win);
        if (typeof win.gtag === "function") {
          win.gtag("event", "community_contribution_submit", {
            event_category: "community",
            event_label: record.contributionType,
          });
        }
        status.innerHTML = "<strong>Saving...</strong> Local queue saved. Trying remote review queue.";
        const remote = await insertRemote(win, record);
        status.innerHTML = remoteStatusText(record, remote);
        form.reset();
        const city = form.querySelector('[name="city"]');
        if (city) city.value = "Shanghai";
        syncTargetControls();
      } catch (error) {
        status.innerHTML = `<strong>Not queued.</strong> ${escapeHtml(error.message || "Check the form and try again.")}`;
      }
    });
  }

  function init(win = typeof window !== "undefined" ? window : undefined) {
    const doc = win && win.document;
    if (!doc) return;
    doc.querySelectorAll("[data-community-contribution-app]").forEach(mount => bind(mount, win));
  }

  return {
    TYPE_ROWS,
    MODE_ROWS,
    TARGET_ROWS,
    ROLE_ROWS,
    normalizeContributionType,
    normalizeContributionMode,
    normalizeTargetKind,
    normalizeContributorRole,
    normalizeUrl,
    entryOptionsFromData,
    recordFromPayload,
    recordFromForm,
    remoteRowFromRecord,
    readContributions,
    writeContribution,
    contributionConfig,
    canUseSupabase,
    contributionAccessState,
    insertRemote,
    init,
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => window.RaveCommunityContributions.init(window));
}
