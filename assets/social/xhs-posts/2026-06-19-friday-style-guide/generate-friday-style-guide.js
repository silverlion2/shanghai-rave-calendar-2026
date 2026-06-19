const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = __dirname;
const ROOT = path.resolve(__dirname, "../../../..");
const W = 1080;
const H = 1440;
const SITE = "raveindexsh.top";

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data/events.json"), "utf8"));
const byId = new Map(data.events.map((event) => [event.id, event]));

const eventCopy = {
  "mrd": {
    short: "MRD x TURBO",
    displayTime: "22:00-05:00",
    lineup: "MRD / D_z / Tiya Manson / NAKIN / Justease",
    body: "Dirty House 的快线，trance 和 techno 会更亮一点，不是纯黑硬压。想要速度、旋律和后半夜体力，选这条。",
  },
  "oscar-l-mim-club": {
    short: "Oscar L",
    displayTime: "时间待定",
    lineup: "Oscar L",
    body: "MiM 的大名牌 techno 路线，适合想听更规整、更 club 的一晚。时间没写细，放在后半夜备选也顺。",
  },
  "abyss-faq-kirk": {
    short: "FaQ Pres. KIRK",
    displayTime: "22:00",
    lineup: "Kirk / Shukai / Fischmonger / SHU / PASHRAWBOI",
    body: "Abyss 的硬房间，阵容会比较直给。今晚想把节奏往高处推，先看这条。",
  },
  "health-maxxing-reactor-2026-06-19": {
    short: "HEALTH MAXXING",
    displayTime: "22:00-04:00",
    lineup: "will / BIG WESTI / anal / ruima / Body Training Session",
    body: "Reactor 的 DOME 房间，DJ set 中间插 Body Training Session，像一场带表演的 club workout。",
  },
  "illum-normie-10k99": {
    short: "Normie Corp pres. 10K99",
    displayTime: "22:00-04:00",
    lineup: "10K99 / haina from china / GG lobster / DJSYB / Manqing",
    body: "ILLUM 这场更锋利，deconstructed club、digital hardcore、bass 都在边上。适合想听不那么乖的声音。",
  },
  "onefortyasia-mungk-simbie": {
    short: "ONEFORTYASIA",
    displayTime: "22:00-04:00",
    lineup: "Mungk / Simbie / D8 / Diipset / Sanli / Siesta",
    body: "EXIT 的 140 / dubstep / UKG 线，Mungk 和 Simbie 加本地 support，低频会比直四更好玩。",
  },
  "nikita-zabelin-potent": {
    short: "Nikita Zabelin",
    displayTime: "23:59-06:00",
    lineup: "Tofu / Nikita Zabelin / HUAN HUAN",
    body: "POTENT 的深夜盘，会更偏 groove 和机器感，不是最硬，但适合后半夜慢慢进入。",
  },
  "heim-earworthy-selected-sound": {
    short: "Earworthy Selected Sound",
    displayTime: "16:00-02:00",
    lineup: "Jasper / Lenny G / M!na / Tiehan / Toshio / Jinrong DJ",
    body: "Heim 从下午一路到夜里，selector 味道更重。适合先坐一会儿，再让身体慢慢热起来。",
  },
  "2026-06-19-italo-disco-shanghai-s-italian-roofto": {
    short: "Italo Disco",
    metaVenue: "Skyline Dome",
    displayTime: "21:30-late",
    lineup: "DJ UACA / DJ Rain",
    body: "如果今晚想轻一点，这条是 rooftop / disco / house 路线。外滩夜景、镜球和酒，比地下室友好。",
  },
  "wigwam-weekly-listening-wheon": {
    short: "Weekly Listening: wheon",
    displayTime: "22:00-late",
    lineup: "wheon",
    body: "Wigwam 的 free entry listening 线，deep techno、industrial、psytrance 的影子都在，重点是听感和氛围。",
  },
  "2026-06-19-vibes-up-party-reggae-dancehall-hip-h": {
    short: "Vibes Up Party",
    displayTime: "22:00-04:00",
    lineup: "DJ F-Mark / Shanghai Yard / Popasuda / Dubshottas",
    body: "C's 地下室的 reggae / dancehall / hip-hop，免费进，适合一群朋友放松，不用把晚上安排得太严肃。",
  },
  "hush-three-year-anniversary-dj-david-2026-06-19": {
    short: "HUSH 三周年",
    displayTime: "22:00-05:00",
    lineup: "DJ David",
    body: "INS 里的 HUSH 三周年，trap、rage、hip-hop、edits，会更像大群人一起冲的路线。",
  },
};

const stylePages = [
  {
    file: "02-techno-trance.png",
    slug: "TECHNO / TRANCE",
    cn: "速度、旋律、直四",
    color: "#22d7ee",
    ids: ["mrd", "oscar-l-mim-club"],
    note: "想跳得更直一点，就从这里开始。",
  },
  {
    file: "03-bass-hard-club.png",
    slug: "BASS / HARD CLUB",
    cn: "低频、硬房间、怪一点",
    color: "#ff3931",
    ids: [
      "abyss-faq-kirk",
      "health-maxxing-reactor-2026-06-19",
      "illum-normie-10k99",
      "onefortyasia-mungk-simbie",
    ],
    note: "今晚最有冲击感的几条线都在这页。",
  },
  {
    file: "04-house-groove.png",
    slug: "HOUSE / GROOVE",
    cn: "松一点，顺一点",
    color: "#f6c84b",
    ids: ["nikita-zabelin-potent", "heim-earworthy-selected-sound"],
    note: "不想一上来就硬冲，可以先顺着 groove 走。",
  },
  {
    file: "05-disco-social.png",
    slug: "DISCO / SOCIAL",
    cn: "屋顶、镜球、轻松一点",
    color: "#16c58a",
    ids: ["2026-06-19-italo-disco-shanghai-s-italian-roofto"],
    note: "适合朋友局、约会局，也适合先喝一杯再决定后半夜。",
  },
  {
    file: "06-listening-selector.png",
    slug: "LISTENING / SELECTOR",
    cn: "不赶路，先听进去",
    color: "#a78bfa",
    ids: ["wigwam-weekly-listening-wheon"],
    note: "这页不是最炸，但很适合把耳朵打开。",
  },
  {
    file: "07-hiphop-dancehall.png",
    slug: "HIP-HOP / DANCEHALL",
    cn: "朋友局、地下室、一起热起来",
    color: "#ff7a2f",
    ids: [
      "2026-06-19-vibes-up-party-reggae-dancehall-hip-h",
      "hush-three-year-anniversary-dj-david-2026-06-19",
    ],
    note: "不是 techno，但今晚如果想换口味，这两条很实用。",
  },
];

const titleOptions = [
  "周五今晚去哪跳？12个上海夜场按风格收好",
  "6/19 上海周五夜场：techno、bass、disco、hip-hop 都有",
  "今晚别乱刷了，按你想听的声音选",
];

const caption = `今晚不用从一堆海报里硬猜，我按声音和房间感分好了：

TECHNO / TRANCE：MRD x TURBO、Oscar L
BASS / HARD CLUB：Abyss 的 KIRK、Reactor HEALTH MAXXING、ILLUM 10K99、EXIT ONEFORTYASIA
HOUSE / GROOVE：Nikita Zabelin、Heim Earworthy
DISCO / SOCIAL：Italo Disco
LISTENING / SELECTOR：Wigwam wheon
HIP-HOP / DANCEHALL：C's Vibes Up、HUSH 三周年

想看时间、venue、lineup、海报和详情页，去 ${SITE} 的 Calendar。`;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function posterPath(event) {
  const raw = event.posterUrl || "";
  if (!raw || /^https?:\/\//i.test(raw)) return "";
  return path.join(ROOT, raw.replace(/\//g, path.sep));
}

function cleanEvent(id) {
  const event = byId.get(id);
  if (!event) throw new Error(`Missing event ${id}`);
  const localPoster = posterPath(event);
  if (!localPoster || !fs.existsSync(localPoster)) {
    throw new Error(`Missing local poster for ${id}: ${event.posterUrl}`);
  }
  return {
    ...event,
    ...eventCopy[id],
    localPoster,
  };
}

function charWeight(ch) {
  return /[\u0000-\u00ff]/.test(ch) ? 0.56 : 1;
}

function wrapText(text, maxWeight, maxLines = 3) {
  const words = String(text || "").split(/(\s+)/);
  const lines = [];
  let line = "";
  let weight = 0;

  const pushLine = () => {
    if (line.trim()) lines.push(line.trim());
    line = "";
    weight = 0;
  };

  for (const word of words) {
    const wordWeight = [...word].reduce((sum, ch) => sum + charWeight(ch), 0);
    if (!word.trim()) {
      if (line) {
        line += " ";
        weight += 0.35;
      }
      continue;
    }
    if (weight + wordWeight > maxWeight && line) pushLine();
    if (wordWeight > maxWeight) {
      for (const ch of [...word]) {
        const cw = charWeight(ch);
        if (weight + cw > maxWeight && line) pushLine();
        line += ch;
        weight += cw;
      }
    } else {
      line += word;
      weight += wordWeight;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines) pushLine();
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && lines[maxLines - 1].length > 2 && String(text).length > lines.join("").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[，。；、\s]*$/, "") + "…";
  }
  return lines;
}

function tspans(lines, x, y, size, lineHeight, attrs = "") {
  return lines.map((line, index) => (
    `<tspan x="${x}" y="${y + index * lineHeight}" ${attrs}>${escapeXml(line)}</tspan>`
  )).join("");
}

function metaFor(event) {
  return `${event.metaVenue || event.venue} | 6/19 周五 | ${event.displayTime || event.time || "时间待定"}`;
}

async function dataUri(file, width = 640, height = 880) {
  const buffer = await sharp(file)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function screenshotUri(file) {
  const buffer = await sharp(file)
    .resize(560, 1212, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function defs() {
  return `
    <defs>
      <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="23"/>
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 0.2"/>
        </feComponentTransfer>
      </filter>
      <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
        <path d="M 72 0 L 0 0 0 72" fill="none" stroke="#dff8ff" stroke-width="1" opacity="0.11"/>
        <path d="M 36 0 L 36 72 M 0 36 L 72 36" fill="none" stroke="#dff8ff" stroke-width="0.7" opacity="0.05"/>
      </pattern>
      <linearGradient id="fadeTop" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.3"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.96"/>
      </linearGradient>
      <clipPath id="softClip"><rect x="0" y="0" width="${W}" height="${H}" rx="0"/></clipPath>
      <style>
        .sans { font-family: "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; }
        .cond { font-family: Impact, "Arial Black", "Microsoft YaHei", sans-serif; letter-spacing: 0; }
        .mono { font-family: Consolas, "Courier New", monospace; letter-spacing: 0; }
      </style>
    </defs>`;
}

function materialBackground(accent, posterUris = []) {
  const posterLayer = posterUris.slice(0, 10).map((uri, index) => {
    const x = [-96, 765, 42, 835, -52, 702, 190, 888, 36, 742][index] ?? 0;
    const y = [120, 92, 890, 725, 548, 1120, -160, 420, 1240, 1010][index] ?? 0;
    const w = [240, 250, 210, 235, 190, 250, 300, 200, 220, 250][index] ?? 220;
    const h = Math.round(w * 1.34);
    const r = [-9, 7, -5, 12, 6, -11, 4, -8, 9, 3][index] ?? 0;
    return `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${h}" opacity="0.18" transform="rotate(${r} ${x + w / 2} ${y + h / 2})"/>`;
  }).join("");

  return `
    <rect width="${W}" height="${H}" fill="#050606"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.9"/>
    <circle cx="155" cy="190" r="360" fill="${accent}" opacity="0.16"/>
    <circle cx="955" cy="1040" r="410" fill="#ff3434" opacity="0.12"/>
    <circle cx="820" cy="260" r="280" fill="#f5c84b" opacity="0.08"/>
    <g clip-path="url(#softClip)">${posterLayer}</g>
    <g opacity="0.22">
      <rect x="54" y="52" width="450" height="118" fill="#f2ead7" transform="rotate(-4 54 52)"/>
      <rect x="660" y="230" width="370" height="96" fill="#f2ead7" transform="rotate(6 660 230)"/>
      <rect x="48" y="1195" width="410" height="122" fill="#f2ead7" transform="rotate(3 48 1195)"/>
      <rect x="720" y="1170" width="295" height="82" fill="${accent}" transform="rotate(-7 720 1170)"/>
    </g>
    <g opacity="0.32" stroke="${accent}" stroke-width="2" fill="none">
      <path d="M90 318 C260 260 345 392 520 318 S820 253 1000 332"/>
      <path d="M82 1040 C280 960 425 1140 620 1042 S862 982 1030 1095"/>
      <path d="M-60 640 L1130 460"/>
    </g>
    <g opacity="0.58">
      <rect x="38" y="38" width="1004" height="1364" fill="none" stroke="${accent}" stroke-width="3"/>
      <rect x="62" y="62" width="956" height="1316" fill="none" stroke="#f2ead7" stroke-width="1" opacity="0.28"/>
    </g>
    <g opacity="0.32" class="mono" fill="#f2ead7" font-size="18">
      <text x="66" y="1268">06.19 / SHANGHAI / FRIDAY</text>
      <text x="732" y="158" transform="rotate(90 732 158)">CALENDAR MATERIAL</text>
      <text x="90" y="210" transform="rotate(-4 90 210)">TONIGHT ROUTES</text>
    </g>
    <rect width="${W}" height="${H}" fill="url(#fadeTop)" opacity="0.8"/>
  `;
}

function frameHeader(title, cn, accent, note) {
  return `
    <g class="sans">
      <text x="72" y="116" fill="${accent}" font-size="34" font-weight="800">6/19 周五</text>
      <text x="72" y="182" fill="#f5f0df" font-size="82" font-weight="900" class="cond">${escapeXml(title)}</text>
      <text x="76" y="228" fill="#f5f0df" opacity="0.92" font-size="31" font-weight="700">${escapeXml(cn)}</text>
      <rect x="72" y="256" width="936" height="2" fill="${accent}" opacity="0.78"/>
      <text x="76" y="304" fill="#f5f0df" opacity="0.88" font-size="26">${escapeXml(note)}</text>
    </g>`;
}

function eventTile(event, uri, x, y, w, h, accent, compact = false) {
  const posterW = compact ? 156 : 190;
  const posterH = h - 36;
  const tx = x + posterW + 34;
  const nameLines = wrapText(event.short || event.title, compact ? 24 : 19, compact ? 1 : 2);
  const lineupLines = wrapText(event.lineup || "", compact ? 54 : 42, compact ? 1 : 2);
  const bodyLines = wrapText(event.body || "", compact ? 34 : 33, compact ? 2 : 4);
  const nameFont = compact ? 32 : 40;
  const nameY = compact ? y + 48 : y + 54;
  const nameLineHeight = compact ? 34 : 43;
  const metaY = compact ? y + 88 : y + 146;
  const lineupY = compact ? y + 120 : y + 188;
  const bodyY = compact ? y + 158 : y + 262;
  const bodyFont = compact ? 19 : 25;
  const bodyLineHeight = compact ? 26 : 34;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#080909" opacity="0.9" stroke="${accent}" stroke-width="2"/>
      <rect x="${x + 14}" y="${y + 14}" width="${posterW}" height="${posterH}" fill="#111"/>
      <image href="${uri}" x="${x + 14}" y="${y + 14}" width="${posterW}" height="${posterH}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${x + 14}" y="${y + 14}" width="${posterW}" height="${posterH}" fill="none" stroke="#f5f0df" stroke-width="1" opacity="0.42"/>
      <text class="sans" fill="#f5f0df" font-size="${nameFont}" font-weight="900">
        ${tspans(nameLines, tx, nameY, nameFont, nameLineHeight)}
      </text>
      <text class="mono" x="${tx}" y="${metaY}" fill="${accent}" font-size="${compact ? 18 : 21}" font-weight="700">${escapeXml(metaFor(event))}</text>
      <text class="mono" fill="#d8d2bf" font-size="${compact ? 19 : 21}">
        ${tspans(lineupLines, tx, lineupY, compact ? 18 : 21, compact ? 23 : 27)}
      </text>
      <text class="sans" fill="#f5f0df" opacity="0.93" font-size="${bodyFont}">
        ${tspans(bodyLines, tx, bodyY, bodyFont, bodyLineHeight)}
      </text>
      <rect x="${x + w - 80}" y="${y + 18}" width="50" height="14" fill="${accent}"/>
      <rect x="${x + w - 120}" y="${y + h - 30}" width="90" height="4" fill="${accent}" opacity="0.75"/>
    </g>`;
}

async function renderSvg(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, file));
}

async function renderCover(events, posterUris) {
  const thumbW = 166;
  const thumbH = 220;
  const top = 610;
  const thumbs = events.slice(0, 12).map((event, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 86 + col * 232;
    const y = top + row * 245;
    const r = [-2, 2, -1, 3, 1, -3, 2, -2, 3, -1, 2, -3][index] ?? 0;
    return `
      <g transform="rotate(${r} ${x + thumbW / 2} ${y + thumbH / 2})">
        <rect x="${x - 8}" y="${y - 8}" width="${thumbW + 16}" height="${thumbH + 16}" fill="#f5f0df" opacity="0.9"/>
        <image href="${posterUris[event.id]}" x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" preserveAspectRatio="xMidYMid slice"/>
        <rect x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" fill="none" stroke="#111" stroke-width="3"/>
      </g>`;
  }).join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground("#22d7ee", Object.values(posterUris))}
    <g class="sans">
      <text x="70" y="128" fill="#22d7ee" font-size="36" font-weight="900">6/19 周五 · 端午夜</text>
      <text x="66" y="248" fill="#f5f0df" font-size="92" font-weight="900" class="cond">电子音乐 PARTY</text>
      <text x="66" y="348" fill="#f5f0df" font-size="104" font-weight="900" class="cond">LAST CALL</text>
      <rect x="72" y="385" width="330" height="10" fill="#ff3931"/>
      <rect x="424" y="385" width="145" height="10" fill="#f6c84b"/>
      <rect x="590" y="385" width="220" height="10" fill="#22d7ee"/>
      <text x="72" y="452" fill="#f5f0df" font-size="31" font-weight="700">12 条路线 / 正式 poster / 按风格翻</text>
      <text x="72" y="508" fill="#d8d2bf" font-size="27">techno、bass、house、disco、listening、hip-hop 都放进来了。</text>
      <text x="72" y="558" fill="#d8d2bf" font-size="27">今晚想去哪里，不用从一堆海报里硬猜。</text>
    </g>
    ${thumbs}
    <g class="mono">
      <text x="72" y="1348" fill="#22d7ee" font-size="28" font-weight="900">${SITE}</text>
      <text x="714" y="1348" fill="#f5f0df" font-size="24">CALENDAR INSIDE</text>
    </g>
  </svg>`;

  await renderSvg("01-cover.png", svg);
}

async function renderStylePage(page, posterUris) {
  const events = page.ids.map(cleanEvent);
  const compact = events.length >= 4;
  const yStart = compact ? 355 : events.length === 1 ? 400 : 405;
  const gap = compact ? 24 : 34;
  const tileH = events.length === 1 ? 690 : compact ? 230 : 345;
  const tileW = 936;
  const tiles = events.map((event, index) => {
    const x = 72;
    const y = yStart + index * (tileH + gap);
    return eventTile(event, posterUris[event.id], x, y, tileW, tileH, page.color, compact);
  }).join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground(page.color, page.ids.map((id) => posterUris[id]))}
    ${frameHeader(page.slug, page.cn, page.color, page.note)}
    ${tiles}
    <text class="mono" x="72" y="1380" fill="${page.color}" font-size="24" font-weight="900">${SITE}</text>
  </svg>`;

  await renderSvg(page.file, svg);
}

async function renderCalendarPage(posterUris) {
  const screenshotPath = path.join(OUT_DIR, "calendar-mobile.png");
  if (!fs.existsSync(screenshotPath)) throw new Error("Missing calendar-mobile.png");
  const phone = await screenshotUri(screenshotPath);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground("#22d7ee", Object.values(posterUris).slice(0, 10))}
    <g class="sans">
      <text x="72" y="122" fill="#22d7ee" font-size="34" font-weight="900">最后看周末完整细节</text>
      <text x="66" y="235" fill="#f5f0df" font-size="88" font-weight="900" class="cond">打开网站</text>
      <text x="72" y="300" fill="#f5f0df" font-size="33" font-weight="800">Calendar 里有 venue、时间、lineup、详情页</text>
      <text x="72" y="355" fill="#d8d2bf" font-size="27">前几页帮你选今晚；周末还想继续，就去网站慢慢翻。</text>
    </g>
    <g>
      <rect x="238" y="430" width="604" height="900" rx="44" fill="#070808" stroke="#f5f0df" stroke-width="7"/>
      <rect x="274" y="482" width="532" height="790" rx="18" fill="#000"/>
      <image href="${phone}" x="274" y="482" width="532" height="790" preserveAspectRatio="xMidYMin slice"/>
      <rect x="458" y="452" width="164" height="12" rx="6" fill="#1b1f21"/>
      <circle cx="540" cy="1302" r="16" fill="none" stroke="#333" stroke-width="3"/>
    </g>
    <g class="sans">
      <rect x="126" y="1168" width="828" height="102" fill="#22d7ee"/>
      <text x="168" y="1234" fill="#050606" font-size="44" font-weight="900">${SITE}</text>
      <text x="168" y="1360" fill="#f5f0df" font-size="30" font-weight="800">周末路线、海报、详情页都在 calendar。</text>
    </g>
  </svg>`;
  await renderSvg("08-calendar-site.png", svg);
}

async function renderContactSheet(files) {
  const thumbW = 480;
  const thumbH = 640;
  const gap = 34;
  const headerH = 108;
  const rows = Math.ceil(files.length / 2);
  const sheetW = 1080;
  const sheetH = headerH + rows * thumbH + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const input = await sharp(path.join(OUT_DIR, files[index])).resize(thumbW, thumbH).png().toBuffer();
    const col = index % 2;
    const row = Math.floor(index / 2);
    composites.push({
      input,
      left: 42 + col * (thumbW + gap),
      top: headerH + gap + row * (thumbH + gap),
    });
  }
  const header = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}">
      <rect width="${sheetW}" height="${sheetH}" fill="#050606"/>
      <text x="42" y="70" fill="#22d7ee" font-family="Arial Black, Microsoft YaHei" font-size="42">6/19 FRIDAY XHS CONTACT SHEET</text>
    </svg>`);
  await sharp(header).composite(composites).png().toFile(path.join(OUT_DIR, "contact-sheet.png"));
}

async function writeCopy() {
  const kit = `# 2026-06-19 Friday Xiaohongshu Post

## 标题

1. ${titleOptions[0]}
2. ${titleOptions[1]}
3. ${titleOptions[2]}

## 文案

${caption}

## 图片顺序

1. 01-cover.png
2. 02-techno-trance.png
3. 03-bass-hard-club.png
4. 04-house-groove.png
5. 05-disco-social.png
6. 06-listening-selector.png
7. 07-hiphop-dancehall.png
8. 08-calendar-site.png
`;
  fs.writeFileSync(path.join(OUT_DIR, "publish-kit.md"), kit, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "publish-copy.txt"), `标题：${titleOptions[0]}\n\n文案：\n${caption}\n`, "utf8");
}

async function main() {
  const allIds = Array.from(new Set(stylePages.flatMap((page) => page.ids)));
  const events = allIds.map(cleanEvent);
  const posterUris = {};
  for (const event of events) posterUris[event.id] = await dataUri(event.localPoster);

  const materialSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground("#22d7ee", Object.values(posterUris))}
  </svg>`;
  await renderSvg("00-material-background.png", materialSvg);

  await renderCover(events, posterUris);
  for (const page of stylePages) await renderStylePage(page, posterUris);
  await renderCalendarPage(posterUris);

  const files = [
    "01-cover.png",
    ...stylePages.map((page) => page.file),
    "08-calendar-site.png",
  ];
  await renderContactSheet(files);
  await writeCopy();
  console.log(`Generated ${files.length} cards in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
