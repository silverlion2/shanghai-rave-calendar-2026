(function initCommunityBadges(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RaveCommunityBadges = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function communityBadgesFactory() {
  const BADGE_DEFINITIONS = [
    {
      slug: "event-scout",
      name: "Event Scout",
      description: "Finds source-backed event leads that survive editorial review.",
      category: "source",
      tier: "bronze",
      icon: "EV",
      styleKey: "cyan",
      displayOrder: 10,
      ruleConfig: { autoFrom: ["event"], levels: [1, 5, 15] },
    },
    {
      slug: "source-runner",
      name: "Source Runner",
      description: "Brings stronger public links, ticket routes, and source corrections.",
      category: "source",
      tier: "silver",
      icon: "SR",
      styleKey: "ember",
      displayOrder: 20,
      ruleConfig: { autoFrom: ["source-fix"], levels: [1, 5, 15] },
    },
    {
      slug: "trust-ledger-builder",
      name: "Trust Ledger Builder",
      description: "Improves source notes that make the recommendation trail easier to audit.",
      category: "source",
      tier: "gold",
      icon: "TL",
      styleKey: "gold",
      displayOrder: 30,
      ruleConfig: { manual: true, levels: [1, 5, 15] },
    },
    {
      slug: "lineup-mapper",
      name: "Lineup Mapper",
      description: "Adds DJ, alias, set-time, or lineup evidence to the database.",
      category: "database",
      tier: "bronze",
      icon: "LM",
      styleKey: "rose",
      displayOrder: 40,
      ruleConfig: { autoFrom: ["dj"], levels: [1, 5, 15] },
    },
    {
      slug: "venue-signal",
      name: "Venue Signal",
      description: "Contributes venue, room, policy, address, or recurring-night details.",
      category: "database",
      tier: "bronze",
      icon: "VS",
      styleKey: "green",
      displayOrder: 50,
      ruleConfig: { autoFrom: ["venue"], levels: [1, 5, 15] },
    },
    {
      slug: "poster-archivist",
      name: "Poster Archivist",
      description: "Preserves poster or archive evidence for event history.",
      category: "database",
      tier: "silver",
      icon: "PA",
      styleKey: "paper",
      displayOrder: 60,
      ruleConfig: { manual: true, levels: [1, 5, 15] },
    },
    {
      slug: "love-wall-voice",
      name: "Love Wall Voice",
      description: "Adds approved community notes that match the Love Wall tone.",
      category: "community",
      tier: "bronze",
      icon: "LV",
      styleKey: "rose",
      displayOrder: 70,
      ruleConfig: { manual: true, levels: [1, 5, 15] },
    },
    {
      slug: "care-signal",
      name: "Care Signal",
      description: "Shares practical safety, access, ticketing, or care information.",
      category: "community",
      tier: "silver",
      icon: "CA",
      styleKey: "green",
      displayOrder: 80,
      ruleConfig: { manual: true, levels: [1, 5, 15] },
    },
    {
      slug: "verified-organizer",
      name: "Verified Organizer",
      description: "Admin-verified organizer, crew, or promoter identity.",
      category: "identity",
      tier: "identity",
      icon: "OR",
      styleKey: "gold",
      displayOrder: 110,
      ruleConfig: { adminOnly: true },
    },
    {
      slug: "verified-venue",
      name: "Verified Venue",
      description: "Admin-verified venue or room identity.",
      category: "identity",
      tier: "identity",
      icon: "VE",
      styleKey: "cyan",
      displayOrder: 120,
      ruleConfig: { adminOnly: true },
    },
    {
      slug: "verified-artist",
      name: "Verified Artist",
      description: "Admin-verified artist or DJ identity.",
      category: "identity",
      tier: "identity",
      icon: "AR",
      styleKey: "rose",
      displayOrder: 130,
      ruleConfig: { adminOnly: true },
    },
    {
      slug: "verified-ticketing-source",
      name: "Verified Ticketing Source",
      description: "Admin-verified ticketing or official source identity.",
      category: "identity",
      tier: "identity",
      icon: "TK",
      styleKey: "ember",
      displayOrder: 140,
      ruleConfig: { adminOnly: true },
    },
    {
      slug: "trusted-reviewer",
      name: "Trusted Reviewer",
      description: "Recognized reviewer for source quality and queue decisions.",
      category: "governance",
      tier: "ops",
      icon: "TR",
      styleKey: "paper",
      displayOrder: 170,
      ruleConfig: { adminOnly: true },
      visibility: "private",
    },
    {
      slug: "founding-contributor",
      name: "Founding Contributor",
      description: "Early community builder recognized by the editorial team.",
      category: "governance",
      tier: "ops",
      icon: "FC",
      styleKey: "gold",
      displayOrder: 180,
      ruleConfig: { adminOnly: true },
    },
  ];

  const CATEGORY_LABELS = {
    source: "Source",
    database: "Database",
    community: "Community",
    identity: "Verified",
    governance: "Ops",
  };

  const SAFE_STYLES = new Set(["cyan", "ember", "gold", "rose", "green", "paper"]);

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

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function camelFromSnake(row = {}) {
    return {
      slug: row.slug || row.badge_slug || "",
      badgeSlug: row.badge_slug || row.slug || "",
      name: row.name || "",
      nameZh: row.name_zh || row.nameZh || "",
      description: row.description || "",
      category: row.category || "",
      tier: row.tier || "",
      icon: row.icon || "",
      styleKey: row.style_key || row.styleKey || "",
      displayOrder: row.display_order ?? row.displayOrder,
      ruleConfig: row.rule_config || row.ruleConfig || {},
      visibility: row.visibility || "public",
      level: Number(row.level || 0),
      status: row.status || "",
      sourceType: row.source_type || row.sourceType || "",
      sourceId: row.source_id || row.sourceId || "",
      awardedAt: row.awarded_at || row.awardedAt || "",
      evidence: row.evidence || {},
    };
  }

  function definitionMap(definitions = BADGE_DEFINITIONS) {
    return new Map(definitions.map(definition => [definition.slug, normalizeDefinition(definition)]));
  }

  function normalizeDefinition(row = {}) {
    const item = camelFromSnake(row);
    const slug = cleanText(item.slug || item.badgeSlug, 80);
    const fallback = BADGE_DEFINITIONS.find(definition => definition.slug === slug) || {};
    const styleKey = cleanText(item.styleKey || fallback.styleKey || "cyan", 20);
    return {
      slug,
      name: cleanText(item.name || fallback.name || slug, 80),
      nameZh: cleanText(item.nameZh || fallback.nameZh || "", 80),
      description: cleanText(item.description || fallback.description || "", 260),
      category: cleanText(item.category || fallback.category || "community", 32),
      tier: cleanText(item.tier || fallback.tier || "bronze", 32),
      icon: cleanText(item.icon || fallback.icon || "BD", 8).toUpperCase(),
      styleKey: SAFE_STYLES.has(styleKey) ? styleKey : "cyan",
      displayOrder: Number.isFinite(Number(item.displayOrder ?? fallback.displayOrder))
        ? Number(item.displayOrder ?? fallback.displayOrder)
        : 100,
      ruleConfig: item.ruleConfig || fallback.ruleConfig || {},
      visibility: cleanText(item.visibility || fallback.visibility || "public", 32),
    };
  }

  function normalizeBadge(row = {}, definitions = BADGE_DEFINITIONS) {
    const item = camelFromSnake(row);
    const map = definitionMap(definitions);
    const slug = cleanText(item.badgeSlug || item.slug, 80);
    const definition = map.get(slug) || normalizeDefinition({ slug });
    return {
      ...definition,
      badgeSlug: slug,
      level: Math.min(3, Math.max(1, Number(item.level || 1))),
      status: cleanText(item.status || "active", 24),
      sourceType: cleanText(item.sourceType, 48),
      sourceId: cleanText(item.sourceId, 160),
      awardedAt: cleanText(item.awardedAt, 48),
      evidence: item.evidence || {},
    };
  }

  function badgeSlugForContributionType(type) {
    const contributionType = cleanText(type, 40);
    if (contributionType === "event") return "event-scout";
    if (contributionType === "source-fix") return "source-runner";
    if (contributionType === "dj") return "lineup-mapper";
    if (contributionType === "venue") return "venue-signal";
    return "";
  }

  function pointsForContribution({ status = "", contributionType = "" } = {}) {
    if (status === "accepted") return 10;
    if (status === "merged" && contributionType === "source-fix") return 15;
    if (status === "merged") return 25;
    return 0;
  }

  function levelForCount(count) {
    const value = Number(count || 0);
    if (value >= 15) return 3;
    if (value >= 5) return 2;
    if (value >= 1) return 1;
    return 0;
  }

  function emptyProfileBadgeData(overrides = {}) {
    return {
      displayName: "",
      publicBadges: false,
      totalPoints: 0,
      acceptedContributions: 0,
      mergedContributions: 0,
      badgeCount: 0,
      badges: [],
      reputationEvents: [],
      definitions: BADGE_DEFINITIONS.map(normalizeDefinition),
      error: "",
      ...overrides,
    };
  }

  function profileDataFromRows(input = {}) {
    const {
      summary = {},
      badges = [],
      reputationEvents = [],
      definitions = BADGE_DEFINITIONS,
      error = "",
    } = input;
    const summarySource = Object.keys(summary || {}).length ? summary : input;
    const remoteDefinitions = asArray(definitions).length ? asArray(definitions).map(normalizeDefinition) : BADGE_DEFINITIONS.map(normalizeDefinition);
    const summaryTopBadges = asArray(summarySource.top_badges || summarySource.topBadges);
    const badgeRows = asArray(badges).length ? badges : summaryTopBadges;
    const normalizedBadges = badgeRows
      .map(row => normalizeBadge(row, remoteDefinitions))
      .filter(row => row.badgeSlug && row.status !== "revoked")
      .sort((a, b) => b.level - a.level || a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

    return emptyProfileBadgeData({
      displayName: cleanText(summarySource.display_name || summarySource.displayName, 80),
      publicBadges: summarySource.public_badges === true || summarySource.publicBadges === true,
      totalPoints: Number(summarySource.total_points ?? summarySource.totalPoints ?? 0),
      acceptedContributions: Number(summarySource.accepted_contributions ?? summarySource.acceptedContributions ?? 0),
      mergedContributions: Number(summarySource.merged_contributions ?? summarySource.mergedContributions ?? 0),
      badgeCount: Number(summarySource.badge_count ?? summarySource.badgeCount ?? normalizedBadges.length),
      badges: normalizedBadges,
      reputationEvents: asArray(reputationEvents).map(row => ({
        eventType: cleanText(row.event_type || row.eventType, 80),
        targetType: cleanText(row.target_type || row.targetType, 80),
        targetId: cleanText(row.target_id || row.targetId, 160),
        pointsDelta: Number(row.points_delta ?? row.pointsDelta ?? 0),
        badgeSlug: cleanText(row.badge_slug || row.badgeSlug, 80),
        reason: cleanText(row.reason, 200),
        createdAt: cleanText(row.created_at || row.createdAt, 48),
        metadata: row.metadata || {},
      })),
      definitions: remoteDefinitions.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
      error: cleanText(error, 240),
    });
  }

  async function loadProfileBadgeData(client, userId) {
    if (!client || !userId) return emptyProfileBadgeData();
    const [summaryResult, badgeResult, reputationResult, definitionResult] = await Promise.all([
      client.from("profile_reputation_summary").select("*").eq("user_id", userId).maybeSingle(),
      client
        .from("profile_badges")
        .select("badge_slug,level,status,source_type,source_id,evidence,awarded_at")
        .eq("user_id", userId)
        .eq("status", "active"),
      client
        .from("reputation_events")
        .select("event_type,target_type,target_id,points_delta,badge_slug,reason,metadata,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
      client
        .from("badge_definitions")
        .select("slug,name,name_zh,description,category,tier,icon,style_key,visibility,rule_config,display_order")
        .eq("active", true)
        .order("display_order", { ascending: true }),
    ]);

    const errors = [summaryResult, badgeResult, reputationResult, definitionResult]
      .map(result => result && result.error)
      .filter(Boolean);
    if (errors.length) throw errors[0];

    return profileDataFromRows({
      summary: summaryResult.data || {},
      badges: badgeResult.data || [],
      reputationEvents: reputationResult.data || [],
      definitions: definitionResult.data || BADGE_DEFINITIONS,
    });
  }

  async function setProfilePublicBadgeVisibility(client, userId, publicBadges) {
    if (!client || !userId) throw new Error("Supabase account is required for public badge settings.");
    const { error } = await client
      .from("profiles")
      .update({ public_badges: publicBadges === true })
      .eq("id", userId);
    if (error) throw error;
    return publicBadges === true;
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || "Badge";
  }

  function levelLabel(level) {
    const value = Number(level || 0);
    if (value >= 3) return "Level 3";
    if (value >= 2) return "Level 2";
    if (value >= 1) return "Level 1";
    return "Locked";
  }

  function renderBadgeCard(badge, options = {}) {
    const item = normalizeBadge(badge, options.definitions || BADGE_DEFINITIONS);
    const locked = options.locked || item.status === "locked";
    const level = locked ? 0 : item.level;
    return `
      <article class="community-badge-card" data-badge-style="${escapeHtml(item.styleKey)}" data-badge-category="${escapeHtml(item.category)}" data-badge-tier="${escapeHtml(item.tier)}" data-badge-locked="${locked ? "true" : "false"}">
        <div class="community-badge-pin" aria-hidden="true">
          <span>${escapeHtml(item.icon)}</span>
          <i>${escapeHtml(level ? `L${level}` : "BD")}</i>
        </div>
        <div class="community-badge-copy">
          <span>${escapeHtml(categoryLabel(item.category))} / ${escapeHtml(item.tier)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div class="community-badge-meta">
            <b>${escapeHtml(levelLabel(level))}</b>
            <em>${escapeHtml(item.sourceType ? item.sourceType.replace(/_/g, " ") : locked ? "not earned yet" : "earned")}</em>
          </div>
        </div>
      </article>
    `;
  }

  function renderBadgeMini(badge, options = {}) {
    const item = normalizeBadge(badge, options.definitions || BADGE_DEFINITIONS);
    return `
      <span class="community-badge-mini" data-badge-style="${escapeHtml(item.styleKey)}" title="${escapeHtml(item.name)}">
        <b>${escapeHtml(item.icon)}</b>
        <span>${escapeHtml(item.name)}</span>
        <i>L${escapeHtml(item.level)}</i>
      </span>
    `;
  }

  function renderReputationRows(data) {
    const rows = asArray(data.reputationEvents).slice(0, 5);
    if (!rows.length) {
      return `<div class="community-badge-empty">Accepted community work will appear here after review.</div>`;
    }
    return rows.map(row => {
      const definition = normalizeDefinition({ slug: row.badgeSlug });
      return `
        <div class="community-badge-ledger-row">
          <span>${escapeHtml(row.createdAt ? row.createdAt.slice(0, 10) : "recent")}</span>
          <b>${escapeHtml(row.reason || row.eventType.replace(/_/g, " "))}</b>
          <em>${escapeHtml(row.pointsDelta > 0 ? `+${row.pointsDelta}` : String(row.pointsDelta))}</em>
          <i>${escapeHtml(definition.icon || "BD")}</i>
        </div>
      `;
    }).join("");
  }

  function starterBadges(definitions) {
    return definitions
      .filter(definition => ["event-scout", "source-runner", "lineup-mapper", "venue-signal", "verified-organizer", "founding-contributor"].includes(definition.slug))
      .slice(0, 6);
  }

  function renderBadgeBoard(profileData, options = {}) {
    const data = profileDataFromRows(profileData || {});
    const activeBadges = data.badges.filter(badge => badge.status === "active");
    const displayBadges = activeBadges.length
      ? activeBadges.slice(0, options.limit || 8)
      : starterBadges(data.definitions).map(definition => ({ ...definition, level: 0, status: "locked" }));
    const contributionCount = data.acceptedContributions + data.mergedContributions;
    const isAccount = options.context === "account";
    return `
      <section class="account-panel community-badge-board" data-community-badge-board>
        <div class="community-badge-board-head">
          <div>
            <span>Community badges</span>
            <h2>${escapeHtml(activeBadges.length ? "Your signal stack" : "Earn your first stamp")}</h2>
            <p>${escapeHtml(data.error || "Badges reward source-backed community work, verified identities, and trusted review help.")}</p>
          </div>
          <div class="community-badge-score" aria-label="Community reputation points">
            <b>${escapeHtml(data.totalPoints)}</b>
            <span>points</span>
          </div>
        </div>
        <div class="community-badge-stats">
          <div><b>${escapeHtml(activeBadges.length)}</b><span>badges</span></div>
          <div><b>${escapeHtml(contributionCount)}</b><span>reviewed contributions</span></div>
          <div><b>${escapeHtml(data.publicBadges ? "public" : "private")}</b><span>display mode</span></div>
        </div>
        ${isAccount ? `
          <div class="community-badge-privacy">
            <span>${data.publicBadges ? "Public badge display is on." : "Badges stay private until you opt in."}</span>
            <button class="button" type="button" data-account-action="toggle-public-badges">
              ${data.publicBadges ? "Keep badges private" : "Show public badges"}
            </button>
          </div>
        ` : ""}
        <div class="community-badge-grid">
          ${displayBadges.map(badge => renderBadgeCard(badge, { definitions: data.definitions, locked: badge.status === "locked" })).join("")}
        </div>
        <div class="community-badge-ledger">
          <div class="community-badge-ledger-head">
            <span>Recent reputation</span>
            <b>${escapeHtml(activeBadges.length ? "audited" : "waiting for review")}</b>
          </div>
          ${renderReputationRows(data)}
        </div>
      </section>
    `;
  }

  function renderContributionBadgePreview() {
    const previewSlugs = ["event-scout", "source-runner", "lineup-mapper", "venue-signal"];
    const definitions = BADGE_DEFINITIONS.map(normalizeDefinition);
    return `
      <section class="community-badge-preview" aria-label="Community badge rewards">
        <div class="community-badge-preview-copy">
          <span>Badge rewards</span>
          <h2>Source work becomes visible credit</h2>
          <p>Login-linked submissions can earn badges after editor review. Anonymous leads still help the database, but they cannot receive account credit until claimed later.</p>
        </div>
        <div class="community-badge-preview-grid">
          ${previewSlugs.map(slug => {
            const definition = definitions.find(item => item.slug === slug);
            return renderBadgeCard({ ...definition, level: 1, sourceType: "after review" }, { definitions });
          }).join("")}
        </div>
      </section>
    `;
  }

  function profileLabel(profile = {}) {
    return cleanText(profile.display_name || profile.email || profile.id || "Profile", 120);
  }

  function adminBadgeOptions(definitions = BADGE_DEFINITIONS) {
    return definitions
      .map(normalizeDefinition)
      .filter(definition => definition.ruleConfig.adminOnly || definition.ruleConfig.manual)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }

  async function grantBadge(client, userId, badgeSlug, level, evidence) {
    const { data, error } = await client.rpc("grant_profile_badge", {
      target_user_id: userId,
      target_badge_slug: badgeSlug,
      badge_level: Number(level || 1),
      grant_evidence: evidence || {},
    });
    if (error) throw error;
    return data;
  }

  async function revokeBadge(client, userId, badgeSlug, reason) {
    const { data, error } = await client.rpc("revoke_profile_badge", {
      target_user_id: userId,
      target_badge_slug: badgeSlug,
      revoke_reason: cleanText(reason, 240) || null,
    });
    if (error) throw error;
    return data;
  }

  function renderAdminConsole(state) {
    const profiles = asArray(state.profiles);
    const definitions = adminBadgeOptions(state.definitions);
    const selectedProfile = profiles.find(profile => profile.id === state.selectedUserId) || profiles[0] || {};
    const badgeData = state.badgeData || emptyProfileBadgeData();
    const activeBadges = badgeData.badges.filter(badge => badge.status === "active");
    return `
      <div class="community-badge-admin" data-badge-admin-busy="${state.busy ? "true" : "false"}">
        <div class="community-badge-admin-status">
          <b>${escapeHtml(state.statusTitle || "Badge ops")}</b>
          <span>${escapeHtml(state.statusBody || "Grant identity and governance badges after profile verification.")}</span>
        </div>
        <div class="community-badge-admin-form">
          <label class="control-field">
            <span>Profile</span>
            <select class="select" data-badge-admin-profile>
              ${profiles.length ? profiles.map(profile => `
                <option value="${escapeHtml(profile.id)}" ${profile.id === selectedProfile.id ? "selected" : ""}>${escapeHtml(profileLabel(profile))}</option>
              `).join("") : `<option value="">No profiles loaded</option>`}
            </select>
          </label>
          <label class="control-field">
            <span>Badge</span>
            <select class="select" data-badge-admin-slug>
              ${definitions.map(definition => `<option value="${escapeHtml(definition.slug)}">${escapeHtml(definition.name)}</option>`).join("")}
            </select>
          </label>
          <label class="control-field">
            <span>Level</span>
            <select class="select" data-badge-admin-level>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
          </label>
          <label class="control-field wide">
            <span>Evidence note</span>
            <input class="input" data-badge-admin-evidence placeholder="Verified by DM, venue account, source trail, or editor decision">
          </label>
          <div class="copy-actions">
            <button class="small-button" type="button" data-badge-admin-action="refresh">Refresh</button>
            <button class="small-button" type="button" data-badge-admin-action="grant">Grant badge</button>
            <button class="small-button" type="button" data-badge-admin-action="revoke">Revoke selected badge</button>
          </div>
        </div>
        <div class="community-badge-admin-profile">
          <div>
            <span>Selected profile</span>
            <b>${escapeHtml(profileLabel(selectedProfile))}</b>
            <em>${escapeHtml(selectedProfile.role || "contributor")} / badges ${activeBadges.length} / points ${badgeData.totalPoints}</em>
          </div>
          <div class="community-badge-admin-minis">
            ${activeBadges.length ? activeBadges.map(badge => renderBadgeMini(badge, { definitions: state.definitions })).join("") : "<span>No active badges yet.</span>"}
          </div>
        </div>
      </div>
    `;
  }

  function createSupabaseClient(win) {
    if (win?.RaveAccountSystem?.createSupabaseClient) {
      return win.RaveAccountSystem.createSupabaseClient(win);
    }
    const config = win && (win.ACCOUNT_SUPABASE || win.LOVE_WALL_SUPABASE) || {};
    const url = String(config.url || "").replace(/\/+$/, "");
    const anonKey = String(config.anonKey || "");
    if (!win?.supabase?.createClient || !/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url) || anonKey.length < 20) return null;
    return win.supabase.createClient(url, anonKey);
  }

  function bindAdminConsole(mount, win) {
    const state = {
      client: createSupabaseClient(win),
      profiles: [],
      selectedUserId: "",
      badgeData: emptyProfileBadgeData(),
      definitions: BADGE_DEFINITIONS.map(normalizeDefinition),
      busy: false,
      statusTitle: "Badge ops",
      statusBody: "Loading Supabase badge console.",
    };

    async function loadDefinitions() {
      const { data, error } = await state.client
        .from("badge_definitions")
        .select("slug,name,name_zh,description,category,tier,icon,style_key,visibility,rule_config,display_order")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      state.definitions = data || BADGE_DEFINITIONS;
    }

    async function loadProfiles() {
      const { data, error } = await state.client
        .from("profiles")
        .select("id,email,display_name,role,public_badges,created_at")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      state.profiles = data || [];
      if (!state.selectedUserId && state.profiles[0]) state.selectedUserId = state.profiles[0].id;
    }

    async function loadSelectedBadges() {
      if (!state.selectedUserId) {
        state.badgeData = emptyProfileBadgeData();
        return;
      }
      state.badgeData = await loadProfileBadgeData(state.client, state.selectedUserId);
    }

    function render() {
      mount.innerHTML = renderAdminConsole(state);
      bind();
    }

    async function refresh() {
      if (!state.client) {
        state.statusTitle = "Supabase unavailable";
        state.statusBody = "Badge admin requires the public Supabase config and an admin session.";
        render();
        return;
      }
      state.busy = true;
      render();
      try {
        await loadDefinitions();
        await loadProfiles();
        await loadSelectedBadges();
        state.statusTitle = "Badge ops ready";
        state.statusBody = "Admin RPCs grant or revoke identity badges with an audit event.";
      } catch (error) {
        state.statusTitle = "Badge ops blocked";
        state.statusBody = error.message || "Could not load badge admin data.";
      } finally {
        state.busy = false;
        render();
      }
    }

    async function handle(action) {
      const profileSelect = mount.querySelector("[data-badge-admin-profile]");
      const slugSelect = mount.querySelector("[data-badge-admin-slug]");
      const levelSelect = mount.querySelector("[data-badge-admin-level]");
      const evidenceInput = mount.querySelector("[data-badge-admin-evidence]");
      state.selectedUserId = profileSelect?.value || state.selectedUserId;
      const badgeSlug = slugSelect?.value || "";
      const evidenceText = cleanText(evidenceInput?.value, 240);
      try {
        state.busy = true;
        state.statusTitle = "Working";
        state.statusBody = "Updating badge records.";
        render();
        if (action === "refresh") {
          await refresh();
          return;
        }
        if (!state.selectedUserId || !badgeSlug) throw new Error("Choose a profile and badge first.");
        if (action === "grant") {
          await grantBadge(state.client, state.selectedUserId, badgeSlug, levelSelect?.value || 1, {
            note: evidenceText,
            page: "ops.html",
          });
          state.statusTitle = "Badge granted";
          state.statusBody = "The profile badge and audit event were saved.";
        }
        if (action === "revoke") {
          await revokeBadge(state.client, state.selectedUserId, badgeSlug, evidenceText || "Revoked from Ops console");
          state.statusTitle = "Badge revoked";
          state.statusBody = "The badge is no longer active for this profile.";
        }
        await loadSelectedBadges();
      } catch (error) {
        state.statusTitle = "Badge action failed";
        state.statusBody = error.message || "Badge update failed.";
      } finally {
        state.busy = false;
        render();
      }
    }

    function bind() {
      mount.querySelector("[data-badge-admin-profile]")?.addEventListener("change", async event => {
        state.selectedUserId = event.target.value;
        state.busy = true;
        render();
        try {
          await loadSelectedBadges();
          state.statusTitle = "Profile loaded";
          state.statusBody = "Badge summary refreshed for the selected profile.";
        } catch (error) {
          state.statusTitle = "Profile load failed";
          state.statusBody = error.message || "Could not load selected profile.";
        } finally {
          state.busy = false;
          render();
        }
      });
      mount.querySelectorAll("[data-badge-admin-action]").forEach(button => {
        button.addEventListener("click", () => handle(button.dataset.badgeAdminAction));
      });
    }

    refresh();
  }

  function init(win = typeof window !== "undefined" ? window : undefined) {
    const doc = win && win.document;
    if (!doc) return;
    doc.querySelectorAll("[data-community-badge-preview]").forEach(mount => {
      mount.innerHTML = renderContributionBadgePreview();
    });
    doc.querySelectorAll("[data-community-badge-admin]").forEach(mount => {
      bindAdminConsole(mount, win);
    });
  }

  return {
    BADGE_DEFINITIONS,
    CATEGORY_LABELS,
    escapeHtml,
    normalizeDefinition,
    normalizeBadge,
    badgeSlugForContributionType,
    pointsForContribution,
    levelForCount,
    emptyProfileBadgeData,
    profileDataFromRows,
    loadProfileBadgeData,
    setProfilePublicBadgeVisibility,
    renderBadgeCard,
    renderBadgeMini,
    renderBadgeBoard,
    renderContributionBadgePreview,
    adminBadgeOptions,
    grantBadge,
    revokeBadge,
    init,
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => window.RaveCommunityBadges.init(window));
}
