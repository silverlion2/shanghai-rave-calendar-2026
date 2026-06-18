(function initSubscriptionSystem(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RaveSubscriptionSystem = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function subscriptionFactory() {
  const STORAGE_KEY = "basement-dispatch-subscriptions-v1";
  const SOUND_TAGS = [
    ["hard-techno", "hard techno", "硬核 Techno"],
    ["industrial", "industrial", "工业"],
    ["groovy", "groovy", "律动"],
    ["hypnotic", "hypnotic", "催眠"],
    ["minimal", "minimal", "Minimal"],
    ["melodic", "melodic", "旋律"],
    ["acid", "acid", "Acid"],
    ["trance-adjacent", "trance-adjacent", "Trance 边缘"],
    ["bass-hybrid", "bass hybrid", "Bass 混合"],
    ["live-av", "live / A/V", "Live / 影像"],
    ["warehouse", "warehouse", "仓库"],
    ["rooftop", "rooftop", "露台"],
  ];
  const ALERT_TYPES = [
    ["weekly-picks", "Weekly picks", "每周精选"],
    ["tonight", "Tonight alerts", "今晚提醒"],
    ["ticket-change", "Ticket changes", "票务变化"],
    ["source-upgrade", "Source upgrades", "来源确认"],
    ["new-dj", "DJ / venue watch", "DJ / 场地观察"],
  ];
  const CHANNELS = [
    ["xhs", "Xiaohongshu", "小红书"],
    ["email", "Email", "邮件"],
    ["wechat", "WeChat later", "微信稍后"],
    ["instagram", "Instagram later", "Instagram 稍后"],
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function checkedValues(form, name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(input => input.value);
  }

  function splitList(value) {
    return String(value || "")
      .split(/[,，\n]/)
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 16);
  }

  function readSubscriptions(win) {
    try {
      return JSON.parse(win.localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function writeSubscription(win, record) {
    if (!win.localStorage) return [];
    const rows = readSubscriptions(win);
    rows.unshift(record);
    const trimmed = rows.slice(0, 20);
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  }

  function supabaseConfig(win) {
    const config = win && (win.SUBSCRIPTION_SUPABASE || win.LOVE_WALL_SUPABASE) || {};
    return {
      enabled: config.enabled !== false,
      url: String(config.url || "").replace(/\/+$/, ""),
      anonKey: String(config.anonKey || ""),
      table: config.subscriptionTable || "subscriptions",
    };
  }

  function canUseSupabase(win, config) {
    return Boolean(
      win
      && win.supabase
      && typeof win.supabase.createClient === "function"
      && config.enabled
      && /^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(config.url)
      && config.anonKey.length > 20
    );
  }

  async function insertRemote(win, record) {
    const config = supabaseConfig(win);
    if (!canUseSupabase(win, config)) return { ok: false, skipped: true, message: "Supabase is not configured for public subscription inserts yet." };
    const client = win.supabase.createClient(config.url, config.anonKey);
    const row = {
      email: record.email || null,
      red_handle: record.redHandle || null,
      instagram_handle: record.instagramHandle || null,
      locale: record.locale,
      channels: record.channels,
      sound_tags: record.soundTags,
      venue_tags: record.venueTags,
      alert_types: record.alertTypes,
      source: "subscribe_page",
      consent: record.consent,
      status: "pending",
      metadata: {
        createdLocalAt: record.createdAt,
        page: "subscribe.html",
      },
    };
    const result = await client.from(config.table).insert(row).select("id").maybeSingle();
    if (result.error) return { ok: false, message: result.error.message };
    return { ok: true, id: result.data?.id || "" };
  }

  function renderChipGroup(name, rows, defaults = []) {
    return rows.map(([value, label, zh]) => `
      <label class="subscription-chip">
        <input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${defaults.includes(value) ? "checked" : ""}>
        ${escapeHtml(label)} <span lang="zh-CN">${escapeHtml(zh)}</span>
      </label>
    `).join("");
  }

  function renderForm(mount) {
    mount.innerHTML = `
      <form class="subscription-form" data-subscription-form>
        <div class="subscription-grid">
          <label class="subscription-field">
            <span>Email / 邮件</span>
            <input class="subscription-input" name="email" type="email" autocomplete="email" placeholder="you@example.com">
          </label>
          <label class="subscription-field">
            <span>Xiaohongshu handle / 小红书</span>
            <input class="subscription-input" name="redHandle" type="text" autocomplete="off" placeholder="RED ID or handle">
          </label>
          <label class="subscription-field">
            <span>Instagram handle / 稍后同步</span>
            <input class="subscription-input" name="instagramHandle" type="text" autocomplete="off" placeholder="@handle">
          </label>
          <label class="subscription-field">
            <span>Language / 语言</span>
            <select class="subscription-select" name="locale">
              <option value="en">English first</option>
              <option value="zh">中文优先</option>
              <option value="bilingual">Bilingual / 双语</option>
            </select>
          </label>
        </div>
        <div class="subscription-choice-block">
          <span>Channels / 触达渠道</span>
          <div class="subscription-chip-grid">${renderChipGroup("channels", CHANNELS, ["xhs", "email"])}</div>
        </div>
        <div class="subscription-choice-block">
          <span>Sound tags / 风格标签</span>
          <div class="subscription-chip-grid">${renderChipGroup("soundTags", SOUND_TAGS, ["hard-techno", "industrial", "groovy"])}</div>
        </div>
        <div class="subscription-choice-block">
          <span>Alerts / 提醒类型</span>
          <div class="subscription-chip-grid">${renderChipGroup("alertTypes", ALERT_TYPES, ["weekly-picks", "tonight", "ticket-change"])}</div>
        </div>
        <label class="subscription-field">
          <span>Rooms, crews, DJs / 场地、厂牌、DJ</span>
          <input class="subscription-input" name="venueTags" type="text" placeholder="Abyss, EXIT, POTENT, VOID, NAKIN">
        </label>
        <label class="subscription-consent">
          <input name="consent" type="checkbox" required>
          <span>I agree to receive Basement Dispatch updates and understand this is not official venue, capacity, safety, or ticket status. / 我同意接收更新，并理解活动信息仍需以官方来源为准。</span>
        </label>
        <button class="subscription-submit" type="submit">Save alert profile / 保存提醒</button>
      </form>
      <div class="subscription-status" data-subscription-status>
        <strong>Not saved yet.</strong> Choose Xiaohongshu/email now; WeChat and Instagram can be activated later.
      </div>
    `;
  }

  function recordFromForm(form) {
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const redHandle = String(data.get("redHandle") || "").trim();
    const instagramHandle = String(data.get("instagramHandle") || "").trim();
    if (!email && !redHandle && !instagramHandle) {
      throw new Error("Add at least one contact method: email, Xiaohongshu, or Instagram.");
    }
    return {
      email,
      redHandle,
      instagramHandle,
      locale: String(data.get("locale") || "en"),
      channels: checkedValues(form, "channels"),
      soundTags: checkedValues(form, "soundTags"),
      alertTypes: checkedValues(form, "alertTypes"),
      venueTags: splitList(data.get("venueTags")),
      consent: data.get("consent") === "on",
      createdAt: new Date().toISOString(),
    };
  }

  function statusText(record, remote) {
    const contact = [record.email, record.redHandle, record.instagramHandle].filter(Boolean).join(" / ");
    const remoteText = remote.ok
      ? `Remote queue saved${remote.id ? ` (${remote.id})` : ""}.`
      : remote.skipped
        ? "Saved locally; remote queue is not configured yet."
        : `Saved locally; remote queue failed: ${remote.message}`;
    return `<strong>Saved for ${escapeHtml(contact)}.</strong> ${escapeHtml(remoteText)} Tags: ${escapeHtml(record.soundTags.join(", ") || "all")}.`;
  }

  function bind(mount, win) {
    renderForm(mount);
    const form = mount.querySelector("[data-subscription-form]");
    const status = mount.querySelector("[data-subscription-status]");
    if (!form || !status) return;
    let isSubmitting = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (isSubmitting) return;
      isSubmitting = true;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        const record = recordFromForm(form);
        writeSubscription(win, record);
        if (typeof win.gtag === "function") {
          win.gtag("event", "subscription_submit", {
            event_category: "subscription",
            event_label: record.channels.join(","),
            value: record.soundTags.length,
          });
        }
        status.innerHTML = "<strong>Saving...</strong> Local profile saved. Trying remote queue.";
        const remote = await insertRemote(win, record);
        status.innerHTML = statusText(record, remote);
      } catch (error) {
        status.innerHTML = `<strong>Not saved.</strong> ${escapeHtml(error.message || "Check the form and try again.")}`;
      } finally {
        isSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function init(win = typeof window !== "undefined" ? window : undefined) {
    const doc = win && win.document;
    if (!doc) return;
    doc.querySelectorAll("[data-subscription-app]").forEach(mount => bind(mount, win));
  }

  return {
    init,
    readSubscriptions,
    recordFromForm,
  };
});

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => window.RaveSubscriptionSystem.init(window));
}
