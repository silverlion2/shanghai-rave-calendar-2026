const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = __dirname;
const ROOT = path.resolve(__dirname, "../../../..");
const WIDTH = 1080;
const HEIGHT = 1440;
const SITE_URL = "raveindexsh.top";

const db = JSON.parse(fs.readFileSync(path.join(ROOT, "data/events.json"), "utf8"));
const byId = new Map(db.events.map((event) => [event.id, event]));

const events = {
  photocult: byId.get("photocult-mask-desire-auction"),
  gravity: byId.get("illum-gravity-stateofff"),
  longWave: byId.get("heim-long-wave"),
  alter: byId.get("alter-pavillon"),
  mrd: byId.get("mrd"),
  kirk: byId.get("abyss-faq-kirk"),
  oneforty: byId.get("onefortyasia-mungk-simbie"),
  wheon: byId.get("wigwam-weekly-listening-wheon"),
  health: byId.get("health-maxxing-reactor-2026-06-19"),
  normie: byId.get("illum-normie-10k99"),
  atm: byId.get("atm-leo-monira"),
  sciahri: byId.get("sciahri-potent"),
  hardcore: byId.get("abyss-hardcore-melancholia"),
  soback: byId.get("illum-soback-liquid-dolls"),
  stealTapes: byId.get("exit-298-steal-tapes"),
  liminal: byId.get("liminal-dreams"),
  jasmin: byId.get("jasmin-knopha"),
  friends: byId.get("friendsstandout"),
};

const missing = Object.entries(events).filter(([, event]) => !event);
if (missing.length) {
  throw new Error(`Missing event rows: ${missing.map(([key]) => key).join(", ")}`);
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayWidth(text) {
  let width = 0;
  for (const char of String(text)) {
    width += /[\u0000-\u00ff]/.test(char) ? 0.55 : 1;
  }
  return width;
}

function wrap(text, maxUnits) {
  const source = String(text || "").trim();
  if (!source) return [];
  const tokens = source.includes(" ")
    ? source.split(/(\s+)/).filter(Boolean)
    : Array.from(source);
  const lines = [];
  let line = "";
  for (const token of tokens) {
    const candidate = line ? line + token : token;
    if (displayWidth(candidate) <= maxUnits || !line) {
      line = candidate;
    } else {
      lines.push(line.trim());
      line = token.trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function textLines(text, x, y, options = {}) {
  const {
    size = 24,
    color = "#f3ecdf",
    weight = 800,
    family = "Microsoft YaHei, SimHei, Arial, sans-serif",
    lineHeight = Math.round(size * 1.35),
    maxUnits = 32,
    anchor = "start",
    opacity = 1,
    maxLines = Infinity,
  } = options;
  let cursor = y;
  const out = [];
  const sources = Array.isArray(text) ? text : [text];
  for (const item of sources) {
    const lines = wrap(item, maxUnits);
    for (const line of lines) {
      if (out.length >= maxLines) break;
      out.push(
        `<text x="${x}" y="${cursor}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" opacity="${opacity}">${esc(line)}</text>`,
      );
      cursor += lineHeight;
    }
  }
  return { svg: out.join("\n"), height: cursor - y, nextY: cursor };
}

function timeText(event) {
  if (!event.time || event.time === "Check venue") return "时间待确认";
  return event.time;
}

function dateText(event) {
  const map = {
    "Jun 18": "6/18 周四",
    "Jun 19": "6/19 周五",
    "Jun 20": "6/20 周六",
    "Jun 21": "6/21 周日",
  };
  return map[event.date] || event.date || "日期待确认";
}

function meta(event) {
  return `${event.venue}｜${dateText(event)}｜${timeText(event)}`;
}

function lineupNames(event, max = 6) {
  const names = (event.lineup || []).map((item) => item.name).filter(Boolean);
  if (!names.length) return "Lineup 待更新";
  const shown = names.slice(0, max).join(" / ");
  return names.length > max ? `${shown} / 等` : shown;
}

function shortTitle(event) {
  const map = {
    "PHOTOCULT Pres. Mask. Desire. Auction": "PHOTOCULT",
    "ILLUM Pres. 地心引力抓不住你": "地心引力抓不住你",
    "LONG WAVE: Dragon Boat Festival Special": "LONG WAVE",
    "ALTER. Pavillon": "ALTER. Pavillon",
    "MRD x TURBO": "MRD x TURBO",
    "FaQ Pres. KIRK": "FaQ Pres. KIRK",
    "ONEFORTYASIA Pres. MUNGK (UK) & SIMBIE (AU)": "MUNGK & SIMBIE",
    "Weekly Listening: wheon": "wheon",
    "DOME | idk Pres. HEALTH MAXXING": "HEALTH MAXXING",
    "Normie Corp pres. 10K99": "10K99",
    "A.T.M Pres. LEO MONIRA": "A.T.M / LEO MONIRA",
    "Sciahri (IT)": "Sciahri",
    "Hardcore Melancholia: LOLALITA & BRENNT": "Hardcore Melancholia",
    "LIQUID DOLLS Pres. SOBACK": "SOBACK",
    "298 pres. Steal Tapes": "Steal Tapes",
    "Liminal Dreams": "Liminal Dreams",
    "Jasmin + Knopha": "Jasmin + Knopha",
    FRIENDSSTANDout: "FRIENDSSTANDout",
  };
  return map[event.title] || event.title;
}

function posterHref(event) {
  if (!event || !event.posterUrl) return "";
  const posterPath = path.join(ROOT, event.posterUrl);
  if (!fs.existsSync(posterPath)) return "";
  const ext = path.extname(posterPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(posterPath).toString("base64")}`;
}

function posterTile(event, x, y, w, h, id, opacity = 1) {
  const href = posterHref(event);
  if (!href) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10110f" stroke="#f3ecdf" stroke-opacity="0.4"/>`;
  }
  return `
    <clipPath id="poster-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/></clipPath>
    <image x="${x}" y="${y}" width="${w}" height="${h}" href="${href}" preserveAspectRatio="xMidYMid slice" clip-path="url(#poster-${id})" opacity="${opacity}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#f3ecdf" stroke-width="2" stroke-opacity="0.84"/>
  `;
}

function bg() {
  return `
  <defs>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.055" stroke-width="1"/>
    </pattern>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="2" fill="#11c6db" opacity="0.28"/>
    </pattern>
    <filter id="rough">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.22"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#070807"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" filter="url(#rough)" opacity="0.45"/>
  <path d="M0 0 H314 L268 82 L340 138 L0 226 Z" fill="#d9291f" opacity="0.72"/>
  <path d="M1080 1210 L1080 1440 L796 1440 L882 1340 L814 1292 Z" fill="#d9291f" opacity="0.55"/>
  <path d="M0 1196 L276 1240 L226 1324 L0 1388 Z" fill="#f3ecdf" opacity="0.09"/>
  <rect x="0" y="0" width="1080" height="1440" fill="none" stroke="#f3ecdf" stroke-width="18" stroke-opacity="0.055"/>
  <rect x="62" y="1120" width="156" height="156" fill="url(#dots)" opacity="0.6"/>
  <path d="M48 1250 C92 1218 124 1276 170 1242 S250 1262 300 1236 S374 1260 438 1238 S530 1260 604 1236 S724 1260 814 1242 S958 1262 1034 1236" fill="none" stroke="#f3ecdf" stroke-opacity="0.48" stroke-width="4"/>
  <circle cx="914" cy="88" r="38" fill="none" stroke="#d9291f" stroke-width="8"/>
  <circle cx="914" cy="88" r="12" fill="#11c6db"/>
  `;
}

function brandMark(x = 58, y = 72) {
  return `
    <text x="${x}" y="${y}" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="36" font-weight="900" fill="#f3ecdf" opacity="0.96">BASEMENT</text>
    <text x="${x}" y="${y + 42}" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="36" font-weight="900" fill="#f3ecdf" opacity="0.96">DISPATCH</text>
    <path d="M${x} ${y + 58} L${x + 318} ${y + 58}" stroke="#d9291f" stroke-width="7"/>
  `;
}

function footer() {
  return `
    <rect x="48" y="1342" width="984" height="58" fill="#11c6db"/>
    <rect x="48" y="1334" width="984" height="4" fill="#d9291f"/>
    <text x="72" y="1383" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="35" font-weight="900" fill="#050505">${SITE_URL}</text>
    <text x="1002" y="1382" text-anchor="end" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="24" font-weight="900" fill="#050505">完整活动 CALENDAR 看平台</text>
  `;
}

function header(kicker, title, subtitle) {
  const titleLines = wrap(title, 8);
  let y = 70;
  let out = brandMark(58, 72);
  out += `<text x="852" y="96" text-anchor="end" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="29" font-weight="900" fill="#11c6db">${esc(kicker)}</text>`;
  y = 206;
  for (const line of titleLines) {
    out += `<text x="58" y="${y}" font-family="Impact, Arial Black, Microsoft YaHei, SimHei, sans-serif" font-size="72" font-weight="900" fill="#f3ecdf" stroke="#080908" stroke-width="3" paint-order="stroke">${esc(line)}</text>`;
    y += 78;
  }
  if (subtitle) {
    const sub = textLines(subtitle, 60, y + 6, {
      size: 30,
      color: "#f5c71a",
      weight: 900,
      maxUnits: 32,
      lineHeight: 38,
      maxLines: 2,
    });
    out += sub.svg;
    y = sub.nextY + 16;
  }
  out += `<path d="M58 ${y} L1024 ${y - 8}" stroke="#d9291f" stroke-width="9"/>`;
  out += `<path d="M58 ${y + 15} L1024 ${y + 7}" stroke="#11c6db" stroke-width="3" opacity="0.9"/>`;
  return { svg: out, bottom: y + 34 };
}

function cardShell(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
${bg()}
${content}
${footer()}
</svg>`;
}

function coverPosterCollage() {
  const collage = [
    [events.mrd, 62, 854, 146, 212, -4],
    [events.oneforty, 220, 820, 150, 224, 3],
    [events.atm, 382, 858, 150, 218, -2],
    [events.soback, 544, 820, 150, 224, 4],
    [events.liminal, 706, 858, 150, 218, -3],
    [events.hardcore, 868, 820, 150, 224, 2],
  ];
  return collage
    .map(([event, x, y, w, h, rotate], index) => {
      const href = posterHref(event);
      if (!href) return "";
      return `
        <g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})">
          <rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" fill="#f3ecdf"/>
          <image x="${x}" y="${y}" width="${w}" height="${h}" href="${href}" preserveAspectRatio="xMidYMid slice"/>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#050505" stroke-width="3"/>
          <rect x="${x}" y="${y + h - 34}" width="${w}" height="34" fill="#050505" opacity="0.78"/>
          <text x="${x + 8}" y="${y + h - 11}" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="16" font-weight="900" fill="${index % 2 ? "#f5c71a" : "#11c6db"}">${esc(shortTitle(event)).slice(0, 18)}</text>
        </g>
      `;
    })
    .join("\n");
}

function drawSummaryChoice(choice, x, y, w, h, index) {
  const fill = index % 2 === 0 ? "#f3ecdf" : "#111410";
  const text = index % 2 === 0 ? "#050505" : "#f3ecdf";
  const muted = index % 2 === 0 ? "#303028" : "#c8c3b6";
  const accent = choice.color;
  let out = `
    <path d="M${x} ${y} L${x + w - 6} ${y - 10} L${x + w} ${y + h - 8} L${x + 8} ${y + h} Z" fill="${fill}" stroke="${accent}" stroke-width="3"/>
    <rect x="${x + 18}" y="${y + 18}" width="128" height="38" fill="${accent}"/>
    <text x="${x + 82}" y="${y + 45}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="23" font-weight="900" fill="#050505">${esc(choice.label)}</text>
  `;
  let cursor = y + 88;
  for (const item of choice.items) {
    out += `<text x="${x + 24}" y="${cursor}" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="20" font-weight="900" fill="${text}">${esc(item.title)}</text>`;
    cursor += 27;
    out += `<text x="${x + 24}" y="${cursor}" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="18" font-weight="800" fill="${muted}">${esc(item.lineup)}</text>`;
    cursor += 25;
    const metaSource = String(item.meta).split(" / ");
    const metaLine = textLines(metaSource, x + 24, cursor, {
      size: 16,
      color: accent,
      weight: 900,
      maxUnits: 26,
      lineHeight: 20,
      maxLines: 2,
    });
    out += metaLine.svg;
    cursor = metaLine.nextY + 10;
  }
  return out;
}

function drawEventCard(item, x, y, w, h, index, accent) {
  const isLight = index % 2 === 0;
  const fill = isLight ? "#f3ecdf" : "#111410";
  const titleColor = isLight ? "#050505" : "#f3ecdf";
  const bodyColor = isLight ? "#151713" : "#d8d4c6";
  const muted = isLight ? "#3a3a32" : "#b8b4a8";
  const posterW = 140;
  let out = `
    <path d="M${x} ${y} L${x + w - 8} ${y - 12} L${x + w} ${y + h - 8} L${x + 10} ${y + h} Z" fill="${fill}" stroke="${accent}" stroke-width="3"/>
    ${posterTile(item.event, x + 18, y + 22, posterW, h - 44, `${x}-${y}-${index}`, isLight ? 0.98 : 0.86)}
    <rect x="${x + 18}" y="${y + 22}" width="48" height="40" fill="${accent}"/>
    <text x="${x + 42}" y="${y + 51}" text-anchor="middle" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="24" font-weight="900" fill="#050505">${String(index + 1).padStart(2, "0")}</text>
  `;

  const tx = x + 182;
  out += `<text x="${tx}" y="${y + 42}" font-family="Impact, Arial Black, Microsoft YaHei, SimHei, sans-serif" font-size="30" font-weight="900" fill="${titleColor}">${esc(item.title)}</text>`;
  out += `<text x="${tx}" y="${y + 76}" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="21" font-weight="900" fill="${accent}">${esc(meta(item.event))}</text>`;
  const lineup = textLines(`LINEUP: ${item.lineup || lineupNames(item.event)}`, tx, y + 108, {
    size: 18,
    color: muted,
    weight: 800,
    maxUnits: 47,
    lineHeight: 23,
    maxLines: 2,
  });
  out += lineup.svg;
  const soundY = Math.max(y + 136, lineup.nextY + 6);
  const sound = textLines(`SOUND: ${item.sound}`, tx, soundY, {
    size: 18,
    color: isLight ? "#d9291f" : "#f5c71a",
    weight: 900,
    maxUnits: 47,
    lineHeight: 23,
    maxLines: 2,
  });
  out += sound.svg;
  const copy = textLines(item.copy, tx, Math.max(y + 168, sound.nextY + 8), {
    size: 20,
    color: bodyColor,
    weight: 800,
    maxUnits: 43,
    lineHeight: 28,
    maxLines: 3,
  });
  out += copy.svg;
  return out;
}

function drawEventStack(items, startY, accent, cardHeight = 224) {
  let y = startY;
  let out = "";
  items.forEach((item, index) => {
    out += drawEventCard(item, 54, y, 972, cardHeight, index, accent);
    y += cardHeight + 24;
  });
  return out;
}

function drawRouteRows(routes, startY = 330) {
  let y = startY;
  let out = "";
  for (const [index, route] of routes.entries()) {
    const light = index % 2 === 1;
    out += `<path d="M62 ${y - 44} L1014 ${y - 54} L1024 ${y + 62} L72 ${y + 72} Z" fill="${light ? "#f3ecdf" : "#111410"}" stroke="${route.color}" stroke-width="3"/>`;
    out += `<rect x="86" y="${y - 22}" width="138" height="44" fill="${route.color}"/>`;
    out += `<text x="155" y="${y + 9}" text-anchor="middle" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="25" font-weight="900" fill="#050505">${esc(route.label)}</text>`;
    const routeItems = textLines(route.items, 248, y - 10, {
      size: 20,
      color: light ? "#050505" : "#f3ecdf",
      weight: 900,
      maxUnits: 48,
      lineHeight: 24,
      maxLines: 2,
    });
    out += routeItems.svg;
    out += `<text x="248" y="${Math.max(y + 36, routeItems.nextY + 8)}" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="19" font-weight="800" fill="${light ? "#3a3a32" : "#c8c3b6"}">${esc(route.note)}</text>`;
    y += 112;
  }
  return out;
}

function eventItem(event, title, sound, copy, lineup) {
  return {
    event,
    title: title || shortTitle(event),
    sound,
    copy,
    lineup,
  };
}

const summaryChoices = [
  {
    label: "想快一点",
    color: "#d9291f",
    items: [
      { title: "MRD x TURBO", lineup: "MRD / D_z / Tiya Manson", meta: meta(events.mrd) },
      { title: "FaQ Pres. KIRK", lineup: "Kirk / PASHRAWBOI / Shukai", meta: meta(events.kirk) },
    ],
  },
  {
    label: "想硬一点",
    color: "#f5c71a",
    items: [
      { title: "A.T.M / LEO MONIRA", lineup: "LEO MONIRA / QUAN / Oil Nature", meta: meta(events.atm) },
      { title: "Hardcore / Sciahri", lineup: "LOLALITA / BRENNT / Sciahri", meta: "Abyss｜6/20 周六｜22:00 / POTENT｜6/20 周六｜23:59" },
    ],
  },
  {
    label: "想低频一点",
    color: "#11c6db",
    items: [
      { title: "ONEFORTYASIA", lineup: "MUNGK / SIMBIE / D8", meta: meta(events.oneforty) },
      { title: "SOBACK / Jasmin", lineup: "SOBACK / Sylo / Knopha", meta: "ILLUM｜6/20 周六｜22:00 / Heim｜6/20 周六｜待确认" },
    ],
  },
  {
    label: "想怪一点",
    color: "#d9291f",
    items: [
      { title: "10K99", lineup: "10K99 / haina / GG lobster", meta: meta(events.normie) },
      { title: "HEALTH MAXXING / 地心引力", lineup: "Body Training Session / StateOFFF", meta: "Reactor｜6/19 周五｜22:00 / ILLUM｜6/18 周四｜22:00" },
    ],
  },
  {
    label: "想听进去",
    color: "#f5c71a",
    items: [
      { title: "wheon", lineup: "deep techno / industrial / psytrance", meta: meta(events.wheon) },
      { title: "Liminal Dreams", lineup: "Chingyi / IIN / Rainsoft / Toss", meta: meta(events.liminal) },
    ],
  },
  {
    label: "想舒服跳",
    color: "#11c6db",
    items: [
      { title: "Steal Tapes", lineup: "Steal Tapes / Sam TBD. / Queenie.", meta: meta(events.stealTapes) },
      { title: "LONG WAVE", lineup: "Golgol / SpaceReturn / Xiaolaba", meta: meta(events.longWave) },
    ],
  },
];

const cards = [
  {
    file: "01-cover.png",
    svg: cardShell(`
      ${header("DUANWU WEEKEND", "上海端午电子音乐日历", "6/18 周四 - 6/21 周日｜先看 DJ / lineup / sound").svg}
      <text x="62" y="506" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="38" font-weight="900" fill="#f3ecdf">周四先热身，周五周六是主战场。</text>
      <text x="62" y="562" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="38" font-weight="900" fill="#f3ecdf">周日还有一场本地 lineup 收尾。</text>
      <text x="62" y="672" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="48" font-weight="900" fill="#11c6db">TECHNO / BASS / HARD / LEFTFIELD</text>
      <text x="62" y="744" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="32" font-weight="900" fill="#f5c71a">MRD / KIRK / 10K99 / SOBACK / Liminal Dreams</text>
      ${coverPosterCollage()}
      <rect x="62" y="1128" width="956" height="104" fill="#111410" stroke="#f3ecdf" stroke-width="2"/>
      <text x="94" y="1188" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="29" font-weight="900" fill="#f3ecdf">完整活动 calendar 看平台：</text>
      <text x="450" y="1188" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="34" font-weight="900" fill="#11c6db">${SITE_URL}</text>
    `),
  },
  {
    file: "02-summary.png",
    svg: cardShell(`
      ${header("START HERE", "先按声音选", "想快、想硬、想低频、想怪、想听、想舒服跳").svg}
      <text x="60" y="394" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="28" font-weight="900" fill="#f3ecdf">先选今晚想怎么跳，再看具体场次和 lineup。</text>
      ${drawSummaryChoice(summaryChoices[0], 60, 430, 466, 248, 0)}
      ${drawSummaryChoice(summaryChoices[1], 554, 430, 466, 248, 1)}
      ${drawSummaryChoice(summaryChoices[2], 60, 704, 466, 248, 2)}
      ${drawSummaryChoice(summaryChoices[3], 554, 704, 466, 248, 3)}
      ${drawSummaryChoice(summaryChoices[4], 60, 978, 466, 246, 4)}
      ${drawSummaryChoice(summaryChoices[5], 554, 978, 466, 246, 5)}
    `),
  },
  {
    file: "03-jun18-opening-night.png",
    svg: cardShell(`
      ${header("6/18 周四", "端午前夜先进房间", "先热身，也可以直接进深一点").svg}
      ${drawEventStack(
        [
          eventItem(
            events.photocult,
            "PHOTOCULT",
            "techno-first / hard club / 两个房间",
            "适合想认真进 techno 房间的人。不是只挂一个名字，而是两个房间、完整时间表。",
            "Josie / PASHRAWBOI / howtodo / TiyaManson / SITU / D3M3NTOR",
          ),
          eventItem(
            events.gravity,
            "地心引力抓不住你",
            "experimental club / bass / hard club / deconstructed club",
            "更暗、更不顺耳，重点不是漂亮旋律，而是视觉和低频一起往下压。",
            "StateOFFF / Qiming",
          ),
          eventItem(
            events.longWave,
            "LONG WAVE",
            "house / club / electronic",
            "这条更松，适合先见朋友、热身、把假期打开，不是硬推到底的路线。",
            "Golgol / SpaceReturn / Sam Tbd / Xiaolaba",
          ),
          eventItem(
            events.alter,
            "ALTER. Pavillon",
            "electronic DJ sets / live performance",
            "下午开始，空间更开放；适合不想一上来钻黑房间的人。",
            "Chingyi / Chuan / Xiaolaba / Golgol / Chiyokoo / Pei / Wang Meng + Yu Miao",
          ),
        ],
        344,
        "#11c6db",
        222,
      )}
    `),
  },
  {
    file: "04-jun19-fast-bass.png",
    svg: cardShell(`
      ${header("6/19 周五", "想快一点路线", "MRD / KIRK；低频备选 MUNGK & SIMBIE").svg}
      ${drawEventStack(
        [
          eventItem(
            events.mrd,
            "MRD x TURBO",
            "trance / techno",
            "MRD 这场主线是 trance 和 techno，速度感会更明显；TURBO 加上本地 support，不是普通社交局。",
            "MRD / D_z / Tiya Manson / NAKIN / Justease",
          ),
          eventItem(
            events.kirk,
            "FaQ Pres. KIRK",
            "hard techno / rave / high-BPM club",
            "Kirk 是锚点，Shukai、PASHRAWBOI 等 support 把它做成完整硬房间。",
            "Kirk / Shukai / Fischmonger / SHU / PASHRAWBOI / Headrush b2b Nitta",
          ),
          eventItem(
            events.oneforty,
            "ONEFORTYASIA",
            "bass / dubstep / UKG / 140",
            "这不是四四拍直推。MUNGK 和 SIMBIE 更适合想被低频打到、想听 UK 声音的人。",
            "Mungk / Simbie / D8 / Diipset / Sanli / Siesta / Somebodyyyy",
          ),
        ],
        392,
        "#f5c71a",
        252,
      )}
    `),
  },
  {
    file: "05-jun19-strange-listening.png",
    svg: cardShell(`
      ${header("6/19 周五", "想怪一点路线", "wheon / HEALTH MAXXING / 10K99").svg}
      ${drawEventStack(
        [
          eventItem(
            events.wheon,
            "Weekly Listening: wheon",
            "deep techno / industrial / psytrance / experimental",
            "这场不是大开大合的 peak time，适合想从暗处慢慢进到声音里的人。",
            "wheon",
          ),
          eventItem(
            events.health,
            "HEALTH MAXXING",
            "performance-led club / hard dance / body training",
            "它不是常规 DJ bill：will、anal、ruima 中间夹 Body Training Session，概念感更强。",
            "will / BIG WESTI / anal / ruima / Body Training Session",
          ),
          eventItem(
            events.normie,
            "Normie Corp pres. 10K99",
            "deconstructed club / digital hardcore / bass",
            "更粗糙、更高对比，也更 hyper-online；适合想要不稳定 club 声音的人。",
            "10K99 / haina from china / GG lobster / DJSYB / Manqing",
          ),
        ],
        392,
        "#d9291f",
        252,
      )}
    `),
  },
  {
    file: "06-jun20-hard-pressure.png",
    svg: cardShell(`
      ${header("6/20 周六", "想硬一点路线", "industrial / hardcore / techno-first").svg}
      ${drawEventStack(
        [
          eventItem(
            events.atm,
            "A.T.M / LEO MONIRA",
            "techno / hardcore / industrial techno / EBM",
            "这一条冷、硬、压迫感更强。想要 industrial 和 hard techno 边缘，可以优先看这里。",
            "LEO MONIRA / QUAN / EXTREME JOHN / Oil Nature / Jeff Chong / Sunyoung",
          ),
          eventItem(
            events.hardcore,
            "Hardcore Melancholia",
            "hardcore / hard dance / rave / hard club",
            "名字已经说得很直：更快、更粗、更冲，适合想把能量直接拉满的人。",
            "LOLALITA / BRENNT / XIWI / Not Your Daddy / DJ LOVERBOY",
          ),
          eventItem(
            events.sciahri,
            "Sciahri",
            "techno / late slot / texture-focused",
            "POTENT 的 23:59-06:00 长时段，更适合认真跳后半夜，而不是只听一个热闹开场。",
            "Thomas Futoso / Sciahri / Luke Bye",
          ),
        ],
        392,
        "#11c6db",
        252,
      )}
    `),
  },
  {
    file: "07-jun20-bass-groove-listening.png",
    svg: cardShell(`
      ${header("6/20 周六", "想低频一点路线", "SOBACK / Steal Tapes / Liminal / Jasmin").svg}
      ${drawEventStack(
        [
          eventItem(
            events.soback,
            "LIQUID DOLLS Pres. SOBACK",
            "experimental club / bass / left-field club",
            "这是 headliner-led 的 tour stop。想要暗一点、偏左的低频房间，可以看这条。",
            "SOBACK",
          ),
          eventItem(
            events.stealTapes,
            "298 pres. Steal Tapes",
            "house / techno / underground house",
            "更 groove，不是硬推到死。适合想舒服跳、但又不想太 lounge 的人。",
            "Steal Tapes / Sam TBD. / Queenie. / Max Gross",
          ),
          eventItem(
            events.liminal,
            "Liminal Dreams",
            "ambient / drone / techno / outer music",
            "这条更适合听进去：Chingyi、Rainsoft、IIN、Toss 指向氛围、drone 和 techno 边缘。",
            "Chingyi / IIN / Rainsoft / Toss",
          ),
          eventItem(
            events.jasmin,
            "Jasmin + Knopha",
            "techno-dubstep hybrid / bassy broken club",
            "Sylo、Jasmin、Knopha 指向 broken、bassy、techno-adjacent club，不是一路四四拍。",
            "Sylo / Jasmin / Knopha",
          ),
        ],
        344,
        "#f5c71a",
        222,
      )}
    `),
  },
  {
    file: "08-route-and-sunday.png",
    svg: cardShell(`
      ${header("HOW TO PICK", "六条路线怎么选", "临门一脚，用这张确认路线").svg}
      ${drawRouteRows(
        [
          { label: "想快一点", items: "MRD｜Dirty House｜6/19 周五 22:00 / KIRK｜Abyss｜6/19 周五 22:00", note: "速度感、推进行、深夜硬房间。", color: "#d9291f" },
          { label: "想硬一点", items: "A.T.M｜Reactor｜6/20 周六 22:00 / Hardcore｜Abyss｜6/20 周六 22:00", note: "industrial techno、hardcore、hard dance。", color: "#f5c71a" },
          { label: "想低频一点", items: "ONEFORTYASIA｜EXIT｜6/19 周五 22:00 / SOBACK｜ILLUM｜6/20 周六 22:00", note: "bass、dubstep、UKG、left-field club。", color: "#11c6db" },
          { label: "想怪一点", items: "10K99｜ILLUM｜6/19 周五 22:00 / HEALTH｜Reactor｜6/19 周五 22:00", note: "deconstructed、digital hardcore、performance-led club。", color: "#d9291f" },
          { label: "想听进去", items: "wheon｜Wigwam｜6/19 周五 22:00 / Liminal｜Wigwam｜6/20 周六 20:00", note: "deep techno、ambient、drone、psytrance 边缘。", color: "#f5c71a" },
          { label: "想舒服跳", items: "Steal Tapes｜EXIT｜6/20 周六 22:00 / LONG WAVE｜Heim｜6/18 周四 22:00", note: "house、groove、club，不必一直高压。", color: "#11c6db" },
        ],
        352,
      )}
      <rect x="64" y="1086" width="952" height="146" fill="#f3ecdf"/>
      <text x="92" y="1136" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="30" font-weight="900" fill="#050505">周日收尾：FRIENDSSTANDout</text>
      <text x="92" y="1178" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="22" font-weight="900" fill="#050505">Wigwam｜6/21 周日｜21:00-03:00｜Tsing / 10000 / YKK / Taidi / DJ TRUCK</text>
      <text x="92" y="1216" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="22" font-weight="800" fill="#303028">如果前两晚已经太满，这场更像假期最后的本地 lineup 收尾。</text>
    `),
  },
];

async function makeCalendarCard() {
  const screenshotPath = path.join(OUT_DIR, "calendar-site-fullpage.png");
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Missing site screenshot: ${screenshotPath}`);
  }
  const screenshot = sharp(screenshotPath);
  const metaInfo = await screenshot.metadata();
  const crop = await sharp(screenshotPath)
    .extract({
      left: Math.min(330, metaInfo.width - 940),
      top: Math.min(610, metaInfo.height - 650),
      width: Math.min(850, metaInfo.width - 330),
      height: Math.min(570, metaInfo.height - 610),
    })
    .resize(936, 628, { fit: "cover", position: "top" })
    .png()
    .toBuffer();
  const cropData = `data:image/png;base64,${crop.toString("base64")}`;
  return {
    file: "09-calendar-platform.png",
    svg: cardShell(`
      ${header("FULL CALENDAR", "完整 Calendar 在平台", "小红书放精选路线，完整活动看网站").svg}
      <rect x="62" y="340" width="956" height="648" fill="#111410" stroke="#11c6db" stroke-width="5"/>
      <image x="72" y="350" width="936" height="628" href="${cropData}" preserveAspectRatio="xMidYMid slice"/>
      <rect x="62" y="1022" width="956" height="210" fill="#f3ecdf"/>
      <text x="92" y="1088" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="35" font-weight="900" fill="#050505">完整活动 calendar 请看平台</text>
      <text x="92" y="1142" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="28" font-weight="900" fill="#050505">后续新增、时间调整、更多活动都放这里。</text>
      <text x="92" y="1204" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="50" font-weight="900" fill="#d9291f">${SITE_URL}</text>
    `),
  };
}

async function renderCard(card) {
  const outPath = path.join(OUT_DIR, card.file);
  await sharp(Buffer.from(card.svg)).png().toFile(outPath);
  return outPath;
}

async function renderContactSheet(paths) {
  const cols = 3;
  const thumbW = 360;
  const thumbH = 480;
  const rows = Math.ceil(paths.length / cols);
  const thumbs = await Promise.all(
    paths.map((filePath) => sharp(filePath).resize(thumbW, thumbH).png().toBuffer()),
  );
  const sheet = sharp({
    create: {
      width: cols * thumbW,
      height: rows * thumbH,
      channels: 4,
      background: "#090a09",
    },
  });
  const composite = thumbs.map((input, index) => ({
    input,
    left: (index % cols) * thumbW,
    top: Math.floor(index / cols) * thumbH,
  }));
  await sheet.composite(composite).png().toFile(path.join(OUT_DIR, "contact-sheet.png"));
}

function publishMarkdown(fileNames) {
  return `# 端午上海电子音乐小红书图组

生成时间：2026-06-16 Asia/Shanghai

## 上传顺序

${fileNames.map((name, index) => `${index + 1}. ${name}`).join("\n")}

## 标题备选

- 端午上海电子音乐怎么选？先按声音选
- 6/18 周四-6/21 周日 上海电子音乐端午日历
- 想快、想硬、想低频：端午上海电子音乐路线
- 上海端午电子音乐日历：DJ / lineup / sound

## 正文

端午上海电子音乐怎么选？

6/18 周四到 6/21 周日，端午这几晚可以先按你今晚想要的声音来选：

想快一点：MRD x TURBO / FaQ Pres. KIRK
想硬一点：A.T.M / Hardcore Melancholia / Sciahri
想低频一点：ONEFORTYASIA / SOBACK / Jasmin + Knopha
想怪一点：10K99 / HEALTH MAXXING / 地心引力抓不住你
想听进去一点：wheon / Liminal Dreams
想舒服跳：Steal Tapes / LONG WAVE

图里可以直接看到 venue、日期周几、时间、lineup 和简短判断。小红书这组是精选路线，完整活动 calendar 看平台：${SITE_URL}

出发前再确认时间、票价、入场规则和最终 lineup。

## 标签

#上海周末去哪 #上海端午去哪 #上海电子音乐 #上海techno #上海rave #上海club #上海夜生活 #上海地下音乐 #上海演出 #小众音乐

## 数据口径

活动、venue、时间、lineup 和声音方向来自项目数据库 data/events.json；网站 calendar 截图来自本地站点。`;
}

async function writePublishKit(fileNames) {
  const markdown = publishMarkdown(fileNames);
  fs.writeFileSync(path.join(OUT_DIR, "publish-kit.md"), markdown, "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "publish-copy.txt"),
    markdown
      .replace(/^# .+\n+/, "")
      .replace(/^## .+$/gm, "")
      .replace(/^\d+\. .+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    "utf8",
  );
}

(async () => {
  const calendarCard = await makeCalendarCard();
  const allCards = [...cards, calendarCard];
  const paths = [];
  for (const card of allCards) {
    paths.push(await renderCard(card));
  }
  await renderContactSheet(paths);
  await writePublishKit(allCards.map((card) => card.file));
  console.log(JSON.stringify({ outDir: OUT_DIR, files: paths.map((item) => path.basename(item)) }, null, 2));
})();
