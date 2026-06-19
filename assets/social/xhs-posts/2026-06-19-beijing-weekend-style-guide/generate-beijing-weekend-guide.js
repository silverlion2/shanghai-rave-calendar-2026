const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = __dirname;
const W = 1080;
const H = 1440;
const POSTER_DIR = path.join(OUT_DIR, "posters");

const events = [
  {
    id: "pharmacy-dina",
    title: "PHARMACY: DINA",
    short: "PHARMACY: DINA",
    venue: "Pillbox Beijing",
    date: "6/19 周五",
    time: "23:00-06:00",
    lineup: "DINA / Skogul / Blitz / RICE & BEANS",
    style: "club music / trance energy",
    fit: "今晚想直接进黑房间，选这条。",
    body: "Pillbox 今晚的线比较直接，DINA 加本地 support，适合晚一点到、把节奏慢慢推到后半夜的人。",
    poster: "pharmacy-dina.png",
    url: "https://ra.co/events/2468611",
  },
  {
    id: "steal-tapes",
    title: "ZhaoDai pres. Steal Tapes",
    short: "Steal Tapes",
    venue: "Zhao Dai",
    date: "6/19 周五",
    time: "22:00-05:00",
    lineup: "Steal Tapes / Kongsent / Nigls",
    style: "house / warm loops / groove",
    fit: "今晚想顺着 groove 跳，去这条。",
    body: "ZhaoDai 今晚偏 house，Steal Tapes 的 loop 和鼓组会更有弹性，不是硬压路线，适合从舒服的律动跳进凌晨。",
    poster: "steal-tapes.jpg",
    url: "https://ra.co/events/2469080",
  },
  {
    id: "flaeming-burning",
    title: "Flaeming pres. Burning #01 w/Victin",
    short: "Flaeming / Victin",
    venue: "Groundless Factory",
    date: "6/20 周六",
    time: "22:00-05:00",
    lineup: "Victin / NYB / DJ KINDICH / DAWN / JQ / Artsun",
    style: "techno / queer club pressure",
    fit: "明晚想要更完整的 rave 感，选这条。",
    body: "Groundless Factory 明晚的主线更偏 techno 和 club pressure。Victin 的气质不是单纯猛冲，而是会把能量做得很流动。",
    poster: "flaeming-burning-victin.jpg",
    url: "https://ra.co/events/2466149",
  },
  {
    id: "shabby-club",
    title: "劣《垃圾场》全国巡演北京站 Shabby Club Pres",
    short: "Shabby Club",
    venue: "Pillbox Beijing",
    date: "6/20 周六",
    time: "23:00-06:00",
    lineup: "劣 / Billionhappy / hainafromchina / DJ yangfan666 / DJ Stoleyourbae / Kun",
    style: "hard club / pop damage / chaotic fun",
    fit: "明晚想更乱一点、更热一点，选这条。",
    body: "Pillbox 周六会更像混合口味的 club night，名字已经把态度写出来了。适合想听不那么规矩的东西，也想人多一点。",
    poster: "shabby-club-beijing.png",
    url: "https://ra.co/events/2469917",
  },
  {
    id: "summer-breeze",
    title: "SUMMER BREEZE X FLOW POOL PARTY",
    short: "Summer Breeze",
    venue: "APAILANG Creative Planet",
    date: "6/20 周六",
    time: "19:00-03:00",
    lineup: "Aruna / ALIBERTI / Bobby Du / DJ Eric Lee / Mickey Zhang",
    style: "pool party / social / open-air",
    fit: "想轻松一点、从傍晚玩到夜里，选这条。",
    body: "这条不是地下室，是朝阳公园的湖畔泳池路线。适合朋友局、社交局，也适合不想一上来就被低频包住的人。",
    poster: "summer-breeze-pool.png",
    url: "https://ra.co/events/2469282",
  },
  {
    id: "wine-dancer",
    title: "Wander pres. Wine Dancer",
    short: "Wine Dancer",
    venue: "Zhao Dai",
    date: "6/20 周六",
    time: "22:00-04:00",
    lineup: "WhiTe / susu / MeiXing",
    style: "deep / organic / relaxed rhythm",
    fit: "明晚想喝一杯再慢慢跳，选这条。",
    body: "Wine Dancer 更像一条有酒、有深度律动的 ZhaoDai 路线。它不会特别凶，但适合让身体慢慢松开。",
    poster: "wine-dancer.jpg",
    url: "https://ra.co/events/2469084",
  },
];

const stylePages = [
  {
    file: "02-tonight-routes.png",
    slug: "TONIGHT",
    cn: "今晚先选这两条",
    accent: "#22d7ee",
    ids: ["pharmacy-dina", "steal-tapes"],
    note: "一个偏黑房间 club pressure，一个偏 house groove。今晚不用纠结太多，按身体状态选。",
  },
  {
    file: "03-techno-hard-club.png",
    slug: "TECHNO / HARD CLUB",
    cn: "明晚想更硬、更热一点",
    accent: "#f13a34",
    ids: ["flaeming-burning", "shabby-club"],
    note: "Groundless Factory 和 Pillbox 都是周六更有冲击感的选择：一个偏 techno，一个更混合。",
  },
  {
    file: "04-house-groove.png",
    slug: "HOUSE / GROOVE",
    cn: "舒服一点，但还是要跳",
    accent: "#35d889",
    ids: ["steal-tapes", "wine-dancer"],
    note: "ZhaoDai 两晚都可以走 groove 线：今晚更 house，明晚更松、更深一点。",
  },
  {
    file: "05-pool-social.png",
    slug: "POOL / SOCIAL",
    cn: "不想钻地下室，就去户外",
    accent: "#ff7a2f",
    ids: ["summer-breeze"],
    note: "这条是泳池和朋友局，下午到晚上接着玩，适合想轻松一点但不想早回家的人。",
  },
];

const titleOptions = [
  "北京周末电子音乐 Last Call：今晚明晚去哪跳",
  "6/19-6/20 北京夜场按风格收好",
  "今晚去 Pillbox 还是 Zhao Dai？明晚也排上",
];

const caption = `北京这两天的电子音乐活动，我按听感和场景收成几条线了。

今晚想直接进舞池：
PHARMACY: DINA @ Pillbox，23:00-06:00，黑房间 club pressure 会更明确。

今晚想顺着 groove 跳：
Steal Tapes @ Zhao Dai，22:00-05:00，house loop 和暖一点的节奏，更适合慢慢进入状态。

明晚想要 techno / rave 感：
Flaeming w/ Victin @ Groundless Factory，22:00-05:00，能量会更完整。

明晚想更热闹、更混合：
Shabby Club @ Pillbox，23:00-06:00，适合一群朋友一起去。

明晚想轻松社交：
Summer Breeze @ 朝阳公园阿派朗，19:00-03:00，是泳池和户外路线。

明晚想喝一杯再跳：
Wine Dancer @ Zhao Dai，22:00-04:00，deep、organic、舒服一点。`;

const publishTitleOptions = [
  "北京 6/19-6/20 电子音乐活动汇总",
  "北京今晚明晚夜场活动清单",
  "北京周末电子音乐活动整理",
];

const publishCaption = `北京 6/19-6/20 电子音乐活动整理：

6/19 周五

1. PHARMACY: DINA
地点：Pillbox Beijing
时间：23:00-06:00
风格：club music / 黑房间
阵容：DINA / Skogul / Blitz / RICE & BEANS

2. Steal Tapes
地点：Zhao Dai
时间：22:00-05:00
风格：house / groove
阵容：Steal Tapes / Kongsent / Nigls

6/20 周六

3. Flaeming / Victin
地点：Groundless Factory
时间：22:00-05:00
风格：techno / club pressure
阵容：Victin / NYB / DJ KINDICH / DAWN / JQ / Artsun

4. Shabby Club
地点：Pillbox Beijing
时间：23:00-06:00
风格：hard club / pop / chaotic club
阵容：劣 / Billionhappy / hainafromchina / DJ yangfan666 / DJ Stoleyourbae / Kun

5. Summer Breeze
地点：APAILANG Creative Planet
时间：19:00-03:00
风格：pool party / outdoor / social
阵容：Aruna / ALIBERTI / Bobby Du / DJ Eric Lee / Mickey Zhang

6. Wine Dancer
地点：Zhao Dai
时间：22:00-04:00
风格：deep / organic / groove
阵容：WhiTe / susu / MeiXing`;

const publishTags = [
  "#北京周末去哪儿",
  "#北京夜生活",
  "#北京电子音乐",
  "#北京活动",
  "#北京live",
  "#北京club",
  "#北京派对",
  "#北京蹦迪",
  "#电子音乐",
  "#techno",
  "#housemusic",
  "#rave",
  "#周末活动",
];

function eventById(id) {
  const event = events.find((item) => item.id === id);
  if (!event) throw new Error(`Missing event ${id}`);
  return event;
}

function posterPath(event) {
  const file = path.join(POSTER_DIR, event.poster);
  if (!fs.existsSync(file)) throw new Error(`Missing poster for ${event.id}: ${file}`);
  return file;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function charWeight(ch) {
  return /[\u0000-\u00ff]/.test(ch) ? 0.56 : 1;
}

function wrapText(text, maxWeight, maxLines = 3) {
  const chunks = String(text || "").split(/(\s+)/);
  const lines = [];
  let line = "";
  let weight = 0;

  function pushLine() {
    if (line.trim()) lines.push(line.trim());
    line = "";
    weight = 0;
  }

  for (const chunk of chunks) {
    const clean = chunk.trim();
    if (!clean) {
      if (line) {
        line += " ";
        weight += 0.35;
      }
      continue;
    }
    const chunkWeight = [...clean].reduce((sum, ch) => sum + charWeight(ch), 0);
    if (line && weight + chunkWeight > maxWeight) pushLine();
    if (chunkWeight > maxWeight) {
      for (const ch of [...clean]) {
        const cw = charWeight(ch);
        if (line && weight + cw > maxWeight) pushLine();
        line += ch;
        weight += cw;
      }
    } else {
      line += clean;
      weight += chunkWeight;
    }
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines) pushLine();
  if (lines.length > maxLines) lines.length = maxLines;
  const joined = lines.join("");
  if (lines.length === maxLines && joined.length < String(text).replace(/\s/g, "").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[，。；、\s]*$/, "") + "...";
  }
  return lines;
}

function tspans(lines, x, y, size, lineHeight, attrs = "") {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}" ${attrs}>${escapeXml(line)}</tspan>`)
    .join("");
}

async function dataUri(file, width = 560, height = 760) {
  const buffer = await sharp(file)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 86 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function defs() {
  return `
  <defs>
    <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.66" numOctaves="4" seed="619"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.24"/>
      </feComponentTransfer>
    </filter>
    <pattern id="microGrid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M54 0L0 0L0 54" fill="none" stroke="#f5f0df" stroke-width="1" opacity="0.08"/>
      <path d="M27 0L27 54M0 27L54 27" fill="none" stroke="#f5f0df" stroke-width="0.6" opacity="0.04"/>
    </pattern>
    <linearGradient id="vignette" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.32"/>
      <stop offset="0.48" stop-color="#000" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.9"/>
    </linearGradient>
    <style>
      .sans { font-family: "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; letter-spacing: 0; }
      .cond { font-family: Impact, "Arial Black", "Microsoft YaHei", sans-serif; letter-spacing: 0; }
      .mono { font-family: Consolas, "Courier New", monospace; letter-spacing: 0; }
    </style>
  </defs>`;
}

function materialBackground(accent, posterUris, label = "BEIJING WEEKEND") {
  const strips = Array.from({ length: 12 }, (_, index) => {
    const x = -180 + index * 118;
    const y = 155 + (index % 4) * 255;
    const color = index % 3 === 0 ? accent : index % 3 === 1 ? "#f5f0df" : "#f13a34";
    const opacity = index % 3 === 1 ? 0.1 : 0.16;
    return `<rect x="${x}" y="${y}" width="380" height="56" fill="${color}" opacity="${opacity}" transform="rotate(${index % 2 ? -13 : 11} ${x} ${y})"/>`;
  }).join("");

  const posterGhosts = posterUris.map((uri, index) => {
    const coords = [
      [-70, 110, 255, -8],
      [818, 88, 260, 7],
      [42, 922, 235, 8],
      [804, 804, 250, -10],
      [430, -120, 280, 4],
      [650, 1188, 260, 6],
    ][index % 6];
    const [x, y, w, r] = coords;
    return `<image href="${uri}" x="${x}" y="${y}" width="${w}" height="${Math.round(w * 1.38)}" opacity="0.16" transform="rotate(${r} ${x + w / 2} ${y + w / 2})"/>`;
  }).join("");

  return `
    <rect width="${W}" height="${H}" fill="#050606"/>
    <rect width="${W}" height="${H}" fill="url(#microGrid)"/>
    <rect width="${W}" height="${H}" filter="url(#noise)" opacity="0.95"/>
    <circle cx="135" cy="210" r="345" fill="${accent}" opacity="0.17"/>
    <circle cx="940" cy="1030" r="430" fill="#f13a34" opacity="0.13"/>
    <circle cx="870" cy="300" r="280" fill="#f6c84b" opacity="0.09"/>
    ${posterGhosts}
    ${strips}
    <g opacity="0.34" stroke="${accent}" fill="none">
      <path d="M-20 388 C160 304 314 438 520 344 S810 268 1120 386" stroke-width="3"/>
      <path d="M-40 1036 C178 950 365 1124 574 1038 S842 965 1120 1114" stroke-width="2"/>
      <path d="M-80 706 L1170 486" stroke-width="2"/>
      <path d="M190 70 L910 1326" stroke-width="1"/>
    </g>
    <g class="mono" fill="#f5f0df" opacity="0.36" font-size="18">
      <text x="70" y="1270">06.19-06.20 / BEIJING / WEEKEND</text>
      <text x="784" y="154" transform="rotate(90 784 154)">${escapeXml(label)}</text>
      <text x="90" y="222" transform="rotate(-6 90 222)">TICKET STUB / POSTER WALL / NIGHT ROUTES</text>
      <text x="70" y="1320">PILLBOX / ZHAO DAI / GROUNDLESS / CHAOYANG PARK</text>
    </g>
    <g opacity="0.52">
      <rect x="38" y="38" width="1004" height="1364" fill="none" stroke="${accent}" stroke-width="3"/>
      <rect x="62" y="62" width="956" height="1316" fill="none" stroke="#f5f0df" stroke-width="1" opacity="0.25"/>
    </g>
    <rect width="${W}" height="${H}" fill="url(#vignette)" opacity="0.86"/>
  `;
}

function header(page) {
  const noteLines = wrapText(page.note, 42, 2);
  return `
    <g class="sans">
      <text x="72" y="112" fill="${page.accent}" font-size="33" font-weight="900">6/19 周五 - 6/20 周六</text>
      <text x="68" y="190" fill="#f5f0df" font-size="82" font-weight="900" class="cond">${escapeXml(page.slug)}</text>
      <text x="74" y="238" fill="#f5f0df" opacity="0.94" font-size="31" font-weight="800">${escapeXml(page.cn)}</text>
      <rect x="72" y="266" width="936" height="2" fill="${page.accent}" opacity="0.84"/>
      <text fill="#f5f0df" opacity="0.88" font-size="25">
        ${tspans(noteLines, 76, 312, 25, 32)}
      </text>
    </g>`;
}

function meta(event) {
  return `${event.venue} | ${event.date} | ${event.time}`;
}

function eventTile(event, uri, x, y, w, h, accent, mode = "normal") {
  const posterW = mode === "feature" ? 350 : 238;
  const posterH = h - 62;
  const posterX = x + 24;
  const posterY = y + 31;
  const textX = posterX + posterW + 34;
  const textW = w - posterW - 88;
  const nameFont = mode === "feature" ? 50 : 40;
  const bodyFont = mode === "feature" ? 25 : 22;
  const nameMax = Math.max(16, Math.floor((textW - 20) / nameFont));
  const titleMax = Math.max(24, Math.floor((textW - 20) / 22));
  const lineupMax = Math.max(24, Math.floor((textW - 20) / 20));
  const bodyMax = Math.max(20, Math.floor((textW - 24) / bodyFont));
  const nameLines = wrapText(event.short, nameMax, 2);
  const titleLines = wrapText(event.title, titleMax, mode === "feature" ? 2 : 1);
  const lineupLines = wrapText(event.lineup, lineupMax, 2);
  const bodyLines = wrapText(event.body, bodyMax, mode === "feature" ? 5 : 3);
  const fitLines = wrapText(event.fit, bodyMax, mode === "feature" ? 2 : 1);
  const metaY = mode === "feature" ? y + 160 : y + 132;
  const titleY = mode === "feature" ? y + 202 : y + 166;
  const lineupY = mode === "feature" ? y + 278 : y + 226;
  const dividerY = mode === "feature" ? y + 330 : y + 268;
  const bodyY = mode === "feature" ? y + 378 : y + 306;
  const fitY = mode === "feature" ? y + h - 72 : y + h - 24;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#070808" opacity="0.94" stroke="${accent}" stroke-width="2"/>
      <rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="none" stroke="#f5f0df" stroke-width="1" opacity="0.16"/>
      <rect x="${posterX - 8}" y="${posterY - 8}" width="${posterW + 16}" height="${posterH + 16}" fill="#f5f0df" opacity="0.9"/>
      <image href="${uri}" x="${posterX}" y="${posterY}" width="${posterW}" height="${posterH}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="${posterX}" y="${posterY}" width="${posterW}" height="${posterH}" fill="none" stroke="#050606" stroke-width="3"/>
      <g class="sans">
        <text fill="#f5f0df" font-size="${nameFont}" font-weight="900">
          ${tspans(nameLines, textX, y + 72, nameFont, mode === "feature" ? 52 : 42)}
        </text>
        <text class="mono" x="${textX}" y="${metaY}" fill="${accent}" font-size="20" font-weight="900">${escapeXml(meta(event))}</text>
        <text fill="#d8d2bf" opacity="0.96" font-size="22">
          ${tspans(titleLines, textX, titleY, 22, 29)}
        </text>
        <text class="mono" fill="#f5f0df" opacity="0.82" font-size="20">
          ${tspans(lineupLines, textX, lineupY, 20, 27)}
        </text>
        <rect x="${textX}" y="${dividerY}" width="${Math.min(textW, 600)}" height="1.5" fill="${accent}" opacity="0.72"/>
        <text fill="#f5f0df" opacity="0.95" font-size="${bodyFont}">
          ${tspans(bodyLines, textX, bodyY, bodyFont, mode === "feature" ? 36 : 30)}
        </text>
        <text fill="${accent}" font-size="23" font-weight="900">
          ${tspans(fitLines, textX, fitY, 23, 29)}
        </text>
      </g>
      <rect x="${x + w - 95}" y="${y + 28}" width="62" height="14" fill="${accent}"/>
      <rect x="${x + w - 148}" y="${y + h - 34}" width="112" height="5" fill="${accent}" opacity="0.8"/>
    </g>`;
}

async function renderSvg(file, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, file));
}

async function renderCover(posterUris) {
  const thumbW = 172;
  const thumbH = 228;
  const coords = [
    [70, 624, -5],
    [286, 584, 3],
    [502, 626, -2],
    [718, 584, 4],
    [196, 886, 2],
    [598, 890, -4],
  ];
  const thumbs = events.map((event, index) => {
    const [x, y, r] = coords[index];
    return `
      <g transform="rotate(${r} ${x + thumbW / 2} ${y + thumbH / 2})">
        <rect x="${x - 9}" y="${y - 9}" width="${thumbW + 18}" height="${thumbH + 18}" fill="#f5f0df" opacity="0.9"/>
        <image href="${posterUris[event.id]}" x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" preserveAspectRatio="xMidYMid slice"/>
        <rect x="${x}" y="${y}" width="${thumbW}" height="${thumbH}" fill="none" stroke="#050606" stroke-width="3"/>
      </g>`;
  }).join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground("#22d7ee", Object.values(posterUris), "BEIJING WEEKEND LAST CALL")}
    <g class="sans">
      <text x="70" y="122" fill="#22d7ee" font-size="34" font-weight="900">北京 / 6.19-6.20</text>
      <text x="66" y="242" fill="#f5f0df" font-size="92" font-weight="900" class="cond">周末电子音乐</text>
      <text x="66" y="348" fill="#f5f0df" font-size="104" font-weight="900" class="cond">LAST CALL</text>
      <rect x="72" y="384" width="312" height="10" fill="#f13a34"/>
      <rect x="406" y="384" width="160" height="10" fill="#f6c84b"/>
      <rect x="588" y="384" width="230" height="10" fill="#22d7ee"/>
      <text x="72" y="454" fill="#f5f0df" font-size="31" font-weight="800">今晚 2 条 / 明晚 4 条 / 正式 poster</text>
      <text x="72" y="508" fill="#d8d2bf" font-size="27">Pillbox、Zhao Dai、Groundless、朝阳公园都放进来了。</text>
      <text x="72" y="558" fill="#d8d2bf" font-size="27">想硬一点、松一点、户外一点，翻到对应那页就行。</text>
    </g>
    ${thumbs}
    <g class="mono" fill="#f5f0df" font-size="25" font-weight="900">
      <text x="72" y="1240">TONIGHT: PHARMACY / STEAL TAPES</text>
      <text x="72" y="1282">SATURDAY: VICTIN / SHABBY / POOL PARTY / WINE DANCER</text>
      <text x="72" y="1342" fill="#22d7ee">BEIJING NIGHT ROUTES</text>
    </g>
  </svg>`;
  await renderSvg("01-cover.png", svg);
}

async function renderStylePage(page, posterUris) {
  const pageEvents = page.ids.map(eventById);
  const feature = pageEvents.length === 1;
  const tileH = feature ? 760 : 430;
  const yStart = feature ? 408 : 398;
  const tiles = pageEvents
    .map((event, index) => eventTile(event, posterUris[event.id], 72, yStart + index * (tileH + 34), 936, tileH, page.accent, feature ? "feature" : "normal"))
    .join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground(page.accent, page.ids.map((id) => posterUris[id]), page.slug)}
    ${header(page)}
    ${tiles}
    <g class="mono" font-size="22" font-weight="900">
      <text x="72" y="1370" fill="${page.accent}">BEIJING / ${escapeXml(page.slug)} / 6.19-6.20</text>
    </g>
  </svg>`;
  await renderSvg(page.file, svg);
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
    <text x="42" y="70" fill="#22d7ee" font-family="Arial Black, Microsoft YaHei" font-size="40">BEIJING WEEKEND XHS CONTACT SHEET</text>
  </svg>`);
  await sharp(header).composite(composites).png().toFile(path.join(OUT_DIR, "contact-sheet.png"));
}

async function writeCopy(files) {
  const kit = `# 2026-06-19 Beijing Weekend Xiaohongshu Post

## 标题

1. ${publishTitleOptions[0]}
2. ${publishTitleOptions[1]}
3. ${publishTitleOptions[2]}

## 文案

${publishCaption}

## 话题

${publishTags.join(" ")}

## 图片顺序

${files.map((file, index) => `${index + 1}. ${file}`).join("\n")}

## 活动链接

${events.map((event) => `- ${event.title}: ${event.url}`).join("\n")}

## 背景生成提示词

Use case: stylized-concept. Asset type: Xiaohongshu event-carousel background texture, portrait 1080x1440. Create an intricate Beijing underground electronic music weekend background for official event poster thumbnails and Chinese typography. Dark club-night material board, layered photocopied paper, torn ticket stubs, translucent acetate strips, subway-map-like line fragments, stamped date blocks, mixer fader markings, analog grain, light leaks, subtle Beijing hutong concrete and red taxi reflections. No readable text, no logos, no QR code, no fake event posters, no fake artist names, no people faces, no watermark.
`;

  fs.writeFileSync(path.join(OUT_DIR, "publish-kit.md"), kit, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "publish-copy.txt"), `标题：${publishTitleOptions[0]}\n\n文案：\n${publishCaption}\n\n话题：\n${publishTags.join(" ")}\n`, "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "event-data.json"), JSON.stringify({ events, stylePages }, null, 2), "utf8");
}

async function main() {
  const posterUris = {};
  for (const event of events) {
    posterUris[event.id] = await dataUri(posterPath(event));
  }

  const materialSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${defs()}
    ${materialBackground("#22d7ee", Object.values(posterUris), "BEIJING WEEKEND MATERIAL")}
  </svg>`;
  await renderSvg("00-material-background.png", materialSvg);

  await renderCover(posterUris);
  for (const page of stylePages) await renderStylePage(page, posterUris);

  const files = ["01-cover.png", ...stylePages.map((page) => page.file)];
  await renderContactSheet(files);
  await writeCopy(files);

  console.log(`Generated ${files.length} cards in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
