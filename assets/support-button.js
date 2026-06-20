(() => {
  const SCRIPT_ID = "support-button-style";
  const BUTTON_SELECTOR = "[data-support-button]";

  function supportHref() {
    const script = document.currentScript;
    if (script && script.src) {
      return new URL("../support.html", script.src).href;
    }
    return new URL("/support.html", window.location.href).href;
  }

  function injectStyles() {
    if (document.getElementById(SCRIPT_ID)) return;
    const style = document.createElement("style");
    style.id = SCRIPT_ID;
    style.textContent = `
      .support-button-nav,
      .support-button-corner {
        --support-bg: rgba(5, 6, 6, .94);
        --support-ink: #ece8dd;
        --support-line: rgba(54, 199, 231, .66);
        min-width: 0;
        min-height: 44px;
        position: relative;
        isolation: isolate;
        display: inline-grid;
        grid-template-columns: 31px minmax(0, auto);
        align-items: stretch;
        gap: 0;
        overflow: hidden;
        border: 1px solid var(--support-line);
        border-left: 3px solid #d7a928;
        border-radius: 0;
        background:
          linear-gradient(90deg, rgba(215, 169, 40, .2), transparent 34%),
          linear-gradient(180deg, rgba(54, 199, 231, .14), rgba(255, 85, 47, .08) 56%, rgba(5, 6, 6, .96)),
          var(--support-bg);
        box-shadow:
          0 14px 32px rgba(0, 0, 0, .34),
          inset 0 0 0 1px rgba(236, 232, 221, .05);
        color: var(--support-ink);
        padding: 0;
        font-family: "IBM Plex Mono", "Cascadia Mono", "Consolas", monospace;
        line-height: 1;
        text-decoration: none;
        text-transform: uppercase;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, color .18s ease, background .18s ease;
        clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
      }

      .support-button-nav::before,
      .support-button-corner::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: -1;
        background:
          repeating-linear-gradient(90deg, transparent 0 13px, rgba(236, 232, 221, .075) 13px 14px),
          linear-gradient(90deg, transparent, rgba(54, 199, 231, .1) 58%, transparent);
        opacity: .52;
      }

      .support-button-nav::after,
      .support-button-corner::after {
        content: "";
        position: absolute;
        top: 8px;
        right: 8px;
        width: 3px;
        height: 3px;
        background: #ff552f;
        box-shadow: 0 8px 0 rgba(54, 199, 231, .9), 0 16px 0 rgba(215, 169, 40, .9);
      }

      .support-button-nav {
        flex: 0 0 auto;
        margin-left: auto;
      }

      .support-button-corner {
        position: fixed;
        top: max(14px, env(safe-area-inset-top));
        right: max(14px, env(safe-area-inset-right));
        z-index: 120;
      }

      .support-button-nav:hover,
      .support-button-nav:focus-visible,
      .support-button-corner:hover,
      .support-button-corner:focus-visible {
        border-color: #36c7e7;
        background:
          linear-gradient(90deg, rgba(255, 85, 47, .18), transparent 38%),
          linear-gradient(180deg, rgba(54, 199, 231, .34), rgba(5, 6, 6, .92) 64%),
          #050606;
        box-shadow:
          0 17px 38px rgba(0, 0, 0, .42),
          0 0 0 1px rgba(54, 199, 231, .18),
          inset 0 0 0 1px rgba(236, 232, 221, .08);
        color: #ffffff;
        transform: translateY(-1px);
      }

      .support-button-nav__mark,
      .support-button-corner__mark {
        width: 100%;
        min-height: 42px;
        display: inline-grid;
        place-items: center;
        border-right: 1px dashed rgba(236, 232, 221, .36);
        background:
          linear-gradient(180deg, #d7a928, #36c7e7 68%, #ff552f);
        color: #050606;
        font-family: "Barlow Condensed", "Impact", sans-serif;
        font-size: 10px;
        font-weight: 900;
        line-height: .9;
        writing-mode: vertical-rl;
        transform: rotate(180deg);
      }

      .support-button-nav__copy,
      .support-button-corner__copy {
        display: grid;
        align-content: center;
        gap: 3px;
        min-width: 0;
        padding: 7px 28px 7px 10px;
      }

      .support-button-nav__eyebrow,
      .support-button-corner__eyebrow {
        color: #d7a928;
        font-size: 8px;
        font-weight: 800;
        line-height: 1;
      }

      .support-button-nav__label,
      .support-button-corner__label {
        font-family: "Barlow Condensed", "Impact", sans-serif;
        font-size: 17px;
        font-weight: 900;
        line-height: .9;
        white-space: nowrap;
      }

      .support-button-nav__short,
      .support-button-corner__short {
        display: none;
      }

      @media (max-width: 860px) {
        body.support-button-mounted .dispatch-shell > .site-nav > .support-button-nav {
          grid-column: 2;
          grid-row: 1;
          justify-self: end;
        }

        body.support-button-mounted .dispatch-shell > .site-nav > span {
          grid-column: 1 / -1;
          grid-row: 3;
          justify-self: start;
          max-width: 100%;
        }
      }

      @media (max-width: 700px) {
        .support-button-nav,
        .support-button-corner {
          top: max(10px, env(safe-area-inset-top));
          right: max(10px, env(safe-area-inset-right));
          max-width: min(44vw, 138px);
          min-height: 36px;
          grid-template-columns: 24px minmax(0, auto);
        }

        .support-button-nav__mark,
        .support-button-corner__mark {
          min-height: 34px;
          font-size: 9px;
        }

        .support-button-nav__eyebrow,
        .support-button-corner__eyebrow {
          display: none;
        }

        .support-button-nav__copy,
        .support-button-corner__copy {
          padding: 6px 22px 6px 8px;
        }

        .support-button-nav__label,
        .support-button-corner__label {
          overflow: hidden;
          font-size: 14px;
          text-overflow: ellipsis;
        }

        .support-button-nav__full,
        .support-button-corner__full {
          display: none;
        }

        .support-button-nav__short,
        .support-button-corner__short {
          display: inline;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .support-button-nav,
        .support-button-corner {
          transition: none;
        }

        .support-button-nav:hover,
        .support-button-nav:focus-visible,
        .support-button-corner:hover,
        .support-button-corner:focus-visible {
          transform: none;
        }
      }
    `;
    document.head.append(style);
  }

  function navContainer() {
    return document.querySelector(".site-nav, .primary-nav");
  }

  function mountButton() {
    if (document.querySelector(BUTTON_SELECTOR) || !document.body) return;
    injectStyles();
    const nav = navContainer();
    const link = document.createElement("a");
    const placementClass = nav ? "support-button-nav" : "support-button-corner";
    link.className = placementClass;
    link.href = supportHref();
    link.setAttribute("aria-label", "Buy me a coffee");
    link.setAttribute("data-support-button", "");
    link.setAttribute("data-support-placement", nav ? "nav" : "corner");
    link.innerHTML = `
      <span class="${placementClass}__mark" aria-hidden="true">TIP</span>
      <span class="${placementClass}__copy">
        <span class="${placementClass}__eyebrow">Support pass</span>
        <span class="${placementClass}__label">
          <span class="${placementClass}__full">Buy me a coffee</span>
          <span class="${placementClass}__short">Coffee</span>
        </span>
      </span>
    `;
    document.body.classList.add("support-button-mounted");
    if (nav) nav.append(link);
    else document.body.append(link);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton, { once: true });
  } else {
    mountButton();
  }
})();
