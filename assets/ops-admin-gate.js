(function initOpsAdminGate() {
  function text(value) {
    return String(value || "");
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function fieldValue(root, name) {
    return root.querySelector(`[name="${name}"]`)?.value.trim() || "";
  }

  function adminBootstrapSql() {
    return [
      "-- Run after the account has signed in once, so public.profiles exists.",
      "select *",
      "from public.set_profile_role_by_email('owner@example.com', 'admin');",
    ].join("\n");
  }

  function renderAdminSetup() {
    return `
      <div class="ops-admin-setup">
        <span>First admin setup</span>
        <ol class="ops-admin-steps">
          <li>Create the account on account.html with the owner email and an 8+ character password, or use a Supabase magic link. Ops can sign in, but account.html is where the password is first set.</li>
          <li>Run <code>npm run admin:grant -- owner@example.com</code> from a trusted local shell with <code>SUPABASE_DB_URL</code> or <code>SUPABASE_SERVICE_ROLE_KEY</code> configured.</li>
          <li>Or run this in the Supabase SQL Editor after the hardening migration is applied:</li>
        </ol>
        <pre class="ops-admin-sql"><code>${escapeHtml(adminBootstrapSql())}</code></pre>
      </div>
    `;
  }

  function renderGate({ access, error = "", email = "", role = "" }) {
    const eyebrow = access.label;
    const isDenied = access.mode === "denied";
    const isUnavailable = access.mode === "unavailable";
    const isLoading = access.mode === "loading";
    const panelWord = isDenied ? "DENIED" : isUnavailable ? "OFFLINE" : isLoading ? "CHECK" : "LOCKED";
    const title = isDenied ? "Admin role required" : isUnavailable ? "Supabase config required" : "Admin sign in";
    const copy = isDenied
      ? `Signed in as ${email || "this account"}, but profiles.role is ${role || "not set"}. Ask an admin to set this profile to admin before opening Ops.`
      : isUnavailable
        ? "Ops requires the public Supabase URL/key and Supabase client script before the admin gate can run."
        : "Only Supabase users with profiles.role = admin can enter this console.";
    const actions = isDenied
      ? `<button class="button" type="button" data-ops-admin-action="sign-out">Sign out</button><a class="button" href="index.html">Open public site</a>`
      : isUnavailable
        ? `<a class="button" href="account.html">Check account setup</a>`
        : `
            <button class="button primary" type="button" data-ops-admin-action="sign-in">Admin sign in</button>
            <button class="button" type="button" data-ops-admin-action="magic-link">Email link</button>
            <a class="button" href="account.html">Create account</a>
          `;

    return `
      <div class="ops-admin-card" data-ops-admin-mode="${escapeHtml(access.mode)}">
        <div class="ops-admin-panel">
          <span>Admin only</span>
          <strong>${escapeHtml(panelWord)}</strong>
          <p>Ops is not a public account feature. Admin access is granted separately in Supabase profiles.role.</p>
        </div>
        <form class="ops-admin-form" data-ops-admin-form>
          <span>${escapeHtml(eyebrow)}</span>
          <h2>${escapeHtml(title)}</h2>
          <p class="ops-admin-note">${escapeHtml(copy)}</p>
          ${error ? `<div class="ops-admin-error">${escapeHtml(error)}</div>` : ""}
          ${access.mode === "gated" ? `
            <label class="ops-admin-field">
              <span>Email</span>
              <input class="input" name="email" type="email" autocomplete="email" placeholder="Admin email address">
            </label>
            <label class="ops-admin-field">
              <span>Password</span>
              <input class="input" name="password" type="password" autocomplete="current-password" placeholder="Admin password">
            </label>
          ` : ""}
          <div class="ops-admin-actions">${actions}</div>
          <p class="ops-admin-note">Passwords are owned by Supabase Auth. Ops only checks the signed-in user's public.profiles.role value.</p>
          ${renderAdminSetup()}
        </form>
      </div>
    `;
  }

  async function loadProfileRole(client, userId) {
    const { data, error } = await client
      .from("profiles")
      .select("role,email,display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data || {};
  }

  function boot() {
    const system = window.RaveAccountSystem;
    const gate = document.querySelector("[data-ops-admin-gate]");
    const privateConsole = document.querySelector("[data-ops-private]");
    if (!system || !gate || !privateConsole) return;

    let client = system.createSupabaseClient(window);
    let session = null;
    let profile = {};
    let loading = true;
    let error = "";
    let authSubscription = null;

    function currentAccess() {
      return system.adminAccessState({
        loading,
        hasSupabase: Boolean(client),
        session,
        role: profile.role,
      });
    }

    function render() {
      const access = currentAccess();
      if (access.mode === "unlocked") {
        gate.hidden = true;
        privateConsole.hidden = false;
        document.body.dataset.opsAdmin = "unlocked";
        return;
      }
      privateConsole.hidden = true;
      gate.hidden = false;
      document.body.dataset.opsAdmin = access.mode;
      gate.innerHTML = renderGate({
        access,
        error,
        email: session?.user?.email || profile.email || "",
        role: profile.role || "",
      });
      bind();
    }

    async function refresh() {
      error = "";
      if (!client) {
        loading = false;
        render();
        return;
      }
      try {
        const { data } = await client.auth.getSession();
        session = data.session;
        profile = {};
        if (session?.user?.id) {
          profile = await loadProfileRole(client, session.user.id);
        }
      } catch (err) {
        error = err.message || "Could not verify admin role";
      } finally {
        loading = false;
        render();
      }
    }

    async function handleAction(action) {
      if (loading) return;
      error = "";
      if (!client) return;
      const form = gate.querySelector("[data-ops-admin-form]");
      try {
        if (action === "sign-in") {
          const email = fieldValue(form, "email");
          const password = fieldValue(form, "password");
          if (!email || !password) throw new Error("Email and password are required.");
          loading = true;
          render();
          const { error: signInError } = await client.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          loading = true;
          render();
          await refresh();
        }
        if (action === "magic-link") {
          const email = fieldValue(form, "email");
          if (!email) throw new Error("Email is required for an admin link.");
          const { error: linkError } = await client.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.href },
          });
          if (linkError) throw linkError;
          error = "Check email, then return to Ops. Admin role is still required after sign-in.";
          render();
        }
        if (action === "sign-out") {
          await client.auth.signOut();
          session = null;
          profile = {};
          render();
        }
      } catch (err) {
        error = err.message || "Admin gate action failed";
        loading = false;
        render();
      }
    }

    function bind() {
      gate.querySelectorAll("[data-ops-admin-action]").forEach(button => {
        button.addEventListener("click", event => {
          event.preventDefault();
          handleAction(button.dataset.opsAdminAction);
        });
      });
    }

    if (client?.auth?.onAuthStateChange) {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
        loading = true;
        render();
        refresh();
      });
      authSubscription = subscription;
    }

    render();
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
