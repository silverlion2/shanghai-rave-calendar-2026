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

const cards = [
  {
    file: "01-cover.png",
    kind: "cover",
  },
  {
    file: "02-techno.png",
    kind: "style",
    title: "TECHNO",
    color: "#18c6d8",
    events: ["photocult-mask-desire-auction", "minuit-mirror-concept"],
  },
  {
    file: "03-bass-hard-club.png",
    kind: "style",
    title: "BASS / HARD CLUB",
    color: "#e1352c",
    events: ["illum-gravity-stateofff", "cybionte-solo-ykk-heshang"],
  },
  {
    file: "04-house-groove.png",
    kind: "style",
    title: "HOUSE / GROOVE",
    color: "#f2c84b",
    events: ["heim-long-wave", "alter-pavillon"],
  },
  {
    file: "05-disco-social.png",
    kind: "style",
    title: "DISCO / SOCIAL",
    color: "#18c6d8",
    events: ["night-at-museum-90s-disco", "girls-night-out-dome"],
  },
];

const copy = {
  "photocult-mask-desire-auction": {
    name: "PHOTOCULT",
    meta: "Reactor Shanghai｜22:00-04:00",
    lineup: "Josie / PASHRAWBOI / howtodo / TiyaManson / SITU / D3M3NTOR",
    body: "两间 room，阵容和 running order 都比较完整。更适合想沉进黑房间、认真跳一整段的人。",
  },
  "minuit-mirror-concept": {
    name: "MIRROR concept",
    meta: "EXIT｜22:00-05:00",
    lineup: "SLVN / Olivier K / Olivier G / Chabuduo / Live camera + VJing",
    body: "Minuit 的 house / tech-house 线，加上 live camera 和 VJing。比硬 techno 更松，但房间感会更有设计。",
  },
  "illum-gravity-stateofff": {
    name: "State OFFF",
    meta: "ILLUM｜22:00-04:00",
    lineup: "State OFFF / Zean / Qin_niQ / GUZ / Xingli Huang",
    body: "gqom、bass、industrial club 方向，节奏会更碎、更重。适合今晚想要低频和一点怪味的人。",
  },
  "cybionte-solo-ykk-heshang": {
    name: "Cybionte",
    meta: "POTENT｜22:30-late",
    lineup: "Solo / YKK / Heshang / Fat-K / Tayzo / Yomi",
    body: "POTENT 的深夜 club selections，house 底色会多一些。适合慢慢热起来，再把后半夜留给舞池。",
  },
  "heim-long-wave": {
    name: "LONG WAVE",
    meta: "Heim｜22:00-05:00",
    lineup: "Golgol / SpaceReturn / Sam Tbd / Xiaolaba",
    body: "Heim 这场是 house、disco、club music 的松弛线。阵容偏熟人感，适合顺着 groove 跳到很晚。",
  },
  "alter-pavillon": {
    name: "ALTER. Pavillon",
    meta: "Beaufort Terrace｜15:00-02:00",
    lineup: "Chingyi / Chuan / Xiaolaba / Golgol / Chiyokoo / Pei / Wang Meng + Yu Miao",
    body: "从下午到深夜的 open-air electronic，DJ、live、radio 氛围都有。不是单点 club night，更像一整段露台计划。",
  },
  "night-at-museum-90s-disco": {
    name: "Night at the Museum",
    meta: "Fotografiska｜21:00-late",
    lineup: "90s disco / multi-floor DJ sets",
    body: "Fotografiska 的 90s disco 夜，空间和朋友局属性更强。适合看展后续、聊天、轻松跳一下。",
  },
  "girls-night-out-dome": {
    name: "Girls Night Out",
    meta: "The Dome｜21:30-01:30",
    lineup: "DJ Rain / DJ Stefano",
    body: "The Dome 的外滩 rooftop 社交线，house、disco、feel-good classics。更适合喝一杯、看景、轻松开场。",
  },
};

function event(id) {
  const row = byId.get(id);
  if (!row) throw new Error(`Missing event ${id}`);
  return row;
}

function posterPath(id) {
  const row = event(id);
  if (!row.posterUrl) return null;
  const full = path.join(ROOT, row.posterUrl);
  return fs.existsSync(full) ? full : null;
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function widthUnits(text) {
  let units = 0;
  for (const ch of String(text)) units += /[\u0000-\u00ff]/.test(ch) ? 0.58 : 1;
  return units;
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
    if (widthUnits(candidate) <= maxUnits || !line) {
      line = candidate;
    } else {
      lines.push(line.trim());
      line = token.trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function textBlock(text, x, y, opts = {}) {
  const {
    size = 28,
    color = "#f5ead8",
    weight = 800,
    maxUnits = 24,
    maxLines = 99,
    lineHeight = Math.round(size * 1.34),
    anchor = "start",
    family = "Microsoft YaHei, SimHei, Arial, sans-serif",
  } = opts;
  return wrap(text, maxUnits)
    .slice(0, maxLines)
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * lineHeight}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(line)}</text>`,
    )
    .join("\n");
}

function imageHref(file) {
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function defs() {
  return `
  <defs>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
    <filter id="paper">
      <feTurbulence type="fractalNoise" baseFrequency=".68" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 .18"/>
      </feComponentTransfer>
    </filter>
  </defs>`;
}

function background() {
  return `
  ${defs()}
  <rect width="${W}" height="${H}" fill="#070806"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" filter="url(#paper)" opacity=".52"/>
  <path d="M0 0H326L274 86L356 148L0 236Z" fill="#d93128" opacity=".76"/>
  <path d="M1080 1202V1440H794L880 1340L808 1284Z" fill="#d93128" opacity=".58"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#f5ead8" stroke-opacity=".075" stroke-width="18"/>
  <circle cx="922" cy="92" r="38" fill="none" stroke="#d93128" stroke-width="8"/>
  <circle cx="922" cy="92" r="12" fill="#18c6d8"/>`;
}

function brand() {
  return `
  <text x="58" y="76" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="35" font-weight="900" fill="#f5ead8">BASEMENT</text>
  <text x="58" y="118" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="35" font-weight="900" fill="#f5ead8">DISPATCH</text>
  <path d="M58 136H364" stroke="#d93128" stroke-width="7"/>`;
}

function footer() {
  return `
  <rect x="48" y="1342" width="984" height="58" fill="#18c6d8"/>
  <rect x="48" y="1334" width="984" height="4" fill="#d93128"/>
  <text x="72" y="1383" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="35" font-weight="900" fill="#050505">${SITE}</text>`;
}

function posterTile(id, x, y, w, h, idx, label = true) {
  const p = posterPath(id);
  const c = copy[id];
  const clip = `clip-${id}-${idx}`;
  if (!p) {
    return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10110f" stroke="#f5ead8" stroke-opacity=".8" stroke-width="2"/>
    <path d="M${x + 18} ${y + 18}H${x + w - 18}V${y + h - 18}H${x + 18}Z" fill="none" stroke="#18c6d8" stroke-width="3" stroke-dasharray="10 12"/>
    ${textBlock("NO POSTER", x + w / 2, y + h / 2 - 24, { size: 28, anchor: "middle", maxUnits: 10 })}
    ${textBlock(c.name, x + w / 2, y + h / 2 + 26, { size: 28, color: "#f2c84b", anchor: "middle", maxUnits: 9, maxLines: 2, lineHeight: 34 })}`;
  }
  return `
  <clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/></clipPath>
  <image x="${x}" y="${y}" width="${w}" height="${h}" href="${imageHref(p)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#f5ead8" stroke-width="2" stroke-opacity=".88"/>
  ${label ? `<rect x="${x}" y="${y + h - 58}" width="${w}" height="58" fill="#070806" opacity=".88"/>
  ${textBlock(c.name, x + 14, y + h - 31, { size: 22, maxUnits: 11, maxLines: 2, lineHeight: 25 })}` : ""}`;
}

function svgFrame(inner) {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${background()}${brand()}${inner}${footer()}</svg>`;
}

function coverSvg() {
  const ids = [
    "photocult-mask-desire-auction",
    "minuit-mirror-concept",
    "illum-gravity-stateofff",
    "cybionte-solo-ykk-heshang",
    "heim-long-wave",
    "alter-pavillon",
    "night-at-museum-90s-disco",
    "girls-night-out-dome",
  ];
  let s = "";
  s += `<text x="932" y="156" text-anchor="end" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="30" font-weight="900" fill="#f2c84b">6/18 周四 · 今晚</text>`;
  s += textBlock("上海电子音乐", 72, 312, { size: 82, weight: 900, maxUnits: 8, lineHeight: 92 });
  s += textBlock("从黑房间到 rooftop", 76, 410, { size: 31, color: "#18c6d8", maxUnits: 20 });
  const cats = ["TECHNO", "BASS / HARD CLUB", "HOUSE / GROOVE", "DISCO / SOCIAL"];
  cats.forEach((cat, i) => {
    const y = 498 + i * 66;
    s += `<rect x="76" y="${y - 38}" width="${cat.length > 8 ? 444 : 238}" height="48" fill="${i % 2 ? "#f2c84b" : "#d93128"}"/>`;
    s += `<text x="96" y="${y}" font-family="Impact, Arial Black, Microsoft YaHei, sans-serif" font-size="38" font-weight="900" fill="${i % 2 ? "#050505" : "#f5ead8"}">${esc(cat)}</text>`;
  });
  s += `<text x="832" y="646" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="34" font-weight="900" fill="#f5ead8">8 个活动</text>`;
  ids.forEach((id, i) => {
    const x = 70 + (i % 4) * 238;
    const y = 748 + Math.floor(i / 4) * 282;
    s += posterTile(id, x, y, 214, 254, i, true);
  });
  return svgFrame(s);
}

function eventPanel(id, x, y, w, h, accent, idx) {
  const c = copy[id];
  const posterW = 286;
  let s = "";
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#11120f" stroke="#f5ead8" stroke-opacity=".42" stroke-width="2"/>`;
  s += `<rect x="${x}" y="${y}" width="12" height="${h}" fill="${accent}"/>`;
  s += posterTile(id, x + 28, y + 32, posterW, h - 64, idx, false);
  const tx = x + posterW + 58;
  s += textBlock(c.name, tx, y + 72, { size: 44, weight: 900, maxUnits: 16, maxLines: 2, lineHeight: 52 });
  s += textBlock(c.meta, tx, y + 166, { size: 25, color: "#f2c84b", maxUnits: 25, maxLines: 2, lineHeight: 33 });
  s += textBlock(c.lineup, tx, y + 238, { size: 23, color: "#f5ead8", maxUnits: 23, maxLines: 3, lineHeight: 31 });
  s += textBlock(c.body, tx, y + 330, { size: 23, color: "#18c6d8", maxUnits: 24, maxLines: 3, lineHeight: 30 });
  return s;
}

function styleSvg(card) {
  let s = "";
  s += `<text x="932" y="156" text-anchor="end" font-family="Microsoft YaHei, SimHei, Arial, sans-serif" font-size="30" font-weight="900" fill="#f2c84b">6/18 周四 · TONIGHT</text>`;
  s += textBlock(card.title, 72, 294, { size: card.title.length > 12 ? 60 : 78, weight: 900, maxUnits: 16, lineHeight: 82, family: "Impact, Arial Black, Microsoft YaHei, sans-serif" });
  s += `<path d="M76 338H990" stroke="${card.color}" stroke-width="8"/>`;
  s += eventPanel(card.events[0], 70, 408, 940, 398, card.color, 1);
  s += eventPanel(card.events[1], 70, 848, 940, 398, card.title === "HOUSE / GROOVE" ? "#18c6d8" : "#f2c84b", 2);
  return svgFrame(s);
}

async function renderSvg(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, file));
}

async function main() {
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (/^\d{2}-.*\.png$/.test(file) || file === "contact-sheet.png") {
      fs.unlinkSync(path.join(OUT_DIR, file));
    }
  }

  for (const card of cards) {
    await renderSvg(card.kind === "cover" ? coverSvg() : styleSvg(card), card.file);
  }

  const thumbs = [];
  for (const [i, card] of cards.entries()) {
    const buffer = await sharp(path.join(OUT_DIR, card.file)).resize(216, 288).png().toBuffer();
    thumbs.push({
      input: buffer,
      left: 36 + i * 204,
      top: 66,
    });
  }
  const label = Buffer.from(`<svg width="1080" height="420" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="420" fill="#070806"/>
    <text x="40" y="42" font-family="Microsoft YaHei, SimHei, Arial" font-size="24" font-weight="900" fill="#f5ead8">2026-06-18 tonight style guide · official posters from database</text>
  </svg>`);
  await sharp(label)
    .composite(thumbs)
    .png()
    .toFile(path.join(OUT_DIR, "contact-sheet.png"));

  fs.writeFileSync(path.join(OUT_DIR, "publish-copy.txt"), publishCopy(), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "publish-kit.md"), publishKit(), "utf8");
}

function publishCopy() {
  return `6/18 周四今晚上海电子音乐：

TECHNO
PHOTOCULT @ Reactor
两间 room，阵容和 running order 都比较完整，更适合想沉进黑房间、认真跳一整段的人。

MIRROR concept @ EXIT
Minuit 的 house / tech-house 线，加上 live camera 和 VJing。比硬 techno 更松，但房间感会更有设计。

BASS / HARD CLUB
State OFFF @ ILLUM
gqom、bass、industrial club 方向，节奏会更碎、更重，适合今晚想要低频和一点怪味的人。

Cybionte @ POTENT
POTENT 的深夜 club selections，house 底色会多一些。适合慢慢热起来，再把后半夜留给舞池。

HOUSE / GROOVE
LONG WAVE @ Heim
house、disco、club music 的松弛线，阵容偏熟人感，适合顺着 groove 跳到很晚。

ALTER. Pavillon @ Beaufort Terrace
从下午到深夜的 open-air electronic，DJ、live、radio 氛围都有。不是单点 club night，更像一整段露台计划。

DISCO / SOCIAL
Night at the Museum @ Fotografiska
90s disco、多楼层 DJ sets，空间和朋友局属性更强，适合看展后续、聊天、轻松跳一下。

Girls Night Out @ The Dome
外滩 rooftop 社交线，house、disco、feel-good classics。更适合喝一杯、看景、轻松开场。

完整 calendar：raveindexsh.top

#上海今晚去哪 #上海电子音乐 #上海techno #上海rave #上海club #上海夜生活 #小众音乐 #上海周四去哪 #上海约会 #上海展览`;
}

function publishKit() {
  const uploadOrder = cards.map((card, index) => `${index + 1}. ${card.file}`).join("\n");
  const eventRows = Object.entries(copy)
    .map(([id, item]) => {
      const row = event(id);
      return `- ${item.name}: ${row.venue}｜${row.time}｜${item.lineup}｜poster: ${row.posterUrl || "none"}`;
    })
    .join("\n");
  return `# 2026-06-18 Tonight Style Guide

## Upload Order

${uploadOrder}

## Title Options

- 6/18 今晚上海电子音乐
- 今晚上海：techno / bass / house / disco
- 周四上海电子音乐活动整理

## Caption

${publishCopy()}

## Data Scope

Cards are generated from \`data/events.json\` and use official/local poster assets from \`assets/posters\`. MIRROR concept uses the user-provided poster now stored at \`assets/posters/minuit-mirror-concept-2026-06-18.jpg\`.

## Event Rows

${eventRows}
`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
