const {Discogs, MusicBrainz} = require("./dj-api-clients.js");

const candidates = [
  "Gooooose", "33EMYBW", "Anti-General",
  "Knopha", "Heatwolves", "Siesta", "Kalapas", "Aho", "Yadong",
  "D_z", "NAKIN", "Tiya Manson",
  "DINA", "Huizit", "Kilo-Vee", "HeShang",
  "Max Shen", "Limsum", "HUAN HUAN",
  "howtodo", "Josie", "TiyaManson", "D3M3NTOR",
  "F-Mark", "huiscat", "M!R4", "KOUGAR",
  "Heshang", "Solo",
  "10K99", "DJSYB", "Manqing",
  "MAMAYO", "COLA REN",
  "ILLSEE", "Mico", "Taiga",
  "Chiyokoo", "Pei",
  "Jasper", "Lenny G", "M!na", "Tiehan", "Toshio",
  "Tsing", "Pang", "Duan",
  "Fat-K", "Tayzo", "Yomi",
  "Qin_niQ", "Gips", "Digital Jade",
  "badbadbadbad", "ZhuoZhuo", "Xingrui",
  "Xingli Huang", "Tian",
  "2Difficult", "BIANBIAN",
  "BOTOX FATAL", "TUI", "Kong BB", "Noodleprince",
  "LOLALITA", "BRENNT", "XIWI", "Not Your Daddy",
  "Kirk", "Shukai", "Fischmonger", "SHU",
  "will", "BIG WESTI", "anal", "ruima",
  "Sam Tbd", "Queenie.", "Max Gross",
  "PAS", "Gabrielle", "Baby Yung", "Yu-Ya",
  "SpaceReturn", "Sam Tbd.",
  "DISCIPLINE", "Santa K", "PRYMARA",
  "haina from china", "GG lobster",
  "Blood of Life", "Chimera Cult", "Soulitude",
  "JAAL The Machine",
  "Wang Meng", "Yu Miao",
  "Illsee", "DADA",
  "FLOATING", "Kaleidojazzlegs", "Yiyoo",
  "Kazane", "Tevez", "Chabuduo", "SLVN",
  "Olivier K", "Olivier G",
  "Sunyoung", "QUAN", "EXTREME JOHN", "Jeff Chong",
  "HESHANG", "PANG",
  "Jinrong", "Yuqi",
  "SOBACK", "Rain Ling", "Gabrielle Lin", "Bolobolo",
  "Tuihua Lichang", "Wu Xiaotian Erin",
  "Handycam", "ABYSM", "Badfocus",
  "Nosaj Thing", "Lucrecia Dalt", "BADBADNOTGOOD",
  "Mungk", "D8", "Diipset", "Simbie", "Sanli",
  "Somebodyyyy", "iquid Mechanics",
  "Velvet Robot", "Altieri3000",
  "Steal Tapes", "Tom Kynd", "Psyche", "Mr Chang",
  "Matisa", "Sciahri", "Luke Bye", "Thomas Futoso",
  "Erik Hagleton", "Rabeat", "KOD!GO", "ZENKAI",
  "Cosmjn", "Milo Raad", "MegaWatts", "Marcus",
  "Oscar L",
  "Shaun Soomro", "DJ Serang",
  "Jaal", "Toyn", "Bi-NON", "chillchillshit",
  "Limsum", "Tofu", "Nikita Zabelin",
  "Skinny Brown", "IANFABELAR",
  "RB//SH", "Yogijazz", "Bolobolo",
  "Vincent", "Jinrong DJ",
  "Sam Tbd", "Max Shen", "Qin_niQ", "Guz",
  "Popasuda", "Shanghai Yard",
  "DJ F-Mark", "DJ Stefano", "DJ David", "DJ UACA",
  "State OFFF", "StateOFFF",
  "Mega Watts", "Nakin", "D-zi",
  "Heat Wolves", "K N O P H A",
  "Anika Kunst",
  "Mala",
  "The Hymmapan Electron",
  "Gao", "haina", "Man Qing", "SYB", "MANQING",
  "DJ SYB", "Ha Ina"
];

(async () => {
  const unique = Array.from(new Set(candidates.map(n => n.trim())));
  console.log("Total candidates to check:", unique.length);
  console.log("");
  
  const results = [];
  for (let i = 0; i < unique.length; i++) {
    const name = unique[i];
    try {
      const [mb, dc] = await Promise.all([
        MusicBrainz.searchArtist(name),
        Discogs.searchArtist(name)
      ]);
      const hasAny = (mb && mb.found) || (dc && dc.found);
      if (hasAny) {
        results.push({
          name,
          mb: mb && mb.found ? {
            name: mb.name,
            country: mb.country || "",
            genres: mb.genres || [],
            tags: mb.tags || [],
            disambiguation: mb.disambiguation || ""
          } : null,
          dc: dc && dc.found ? {
            name: dc.name,
            genres: dc.genres || [],
            styles: dc.styles || [],
            profileLen: (dc.profile || "").length,
            releaseCount: dc.releaseCount || 0,
            labels: dc.labels || [],
            urls: dc.urls || []
          } : null
        });
      }
    } catch(e) {
      // skip errors
    }
    await new Promise(r => setTimeout(r, 700));
    if (i % 20 === 0 && i > 0) console.log("progress:", i + 1, "/", unique.length);
  }

  console.log("");
  console.log("=== Artistas con datos en MusicBrainz/Discogs ===");
  console.log("");
  
  // Sort: those with most data first
  results.sort((a, b) => {
    const sa = (a.dc ? 1 : 0) + (a.mb ? 1 : 0) + (a.dc && a.dc.releaseCount ? 1 : 0);
    const sb = (b.dc ? 1 : 0) + (b.mb ? 1 : 0) + (b.dc && b.dc.releaseCount ? 1 : 0);
    return sb - sa;
  });

  for (const r of results) {
    const parts = [];
    if (r.mb) {
      const countryPart = r.mb.country ? "country:" + r.mb.country.padEnd(4) : "";
      const tagsPart = (r.mb.tags && r.mb.tags.length) ? ("tags:" + r.mb.tags.slice(0,3).join(",")) : "";
      parts.push("MB:" + r.mb.name.substring(0, 20).padEnd(20, " ") + " " + countryPart + (tagsPart ? " " + tagsPart : ""));
    }
    if (r.dc) {
      const g = (r.dc.genres||[]).slice(0,2).join(",") || (r.dc.styles||[]).slice(0,2).join(",");
      const rel = "rel:" + String(r.dc.releaseCount||0).padStart(3);
      const bio = "bio:" + String(r.dc.profileLen||0).padStart(4);
      parts.push("DC:" + r.dc.name.substring(0, 20).padEnd(20, " ") + " " + rel + " " + bio + (g ? " [" + g + "]" : ""));
    }
    console.log("  " + r.name.padEnd(28), parts.join("  "));
  }
  
  console.log("");
  console.log("Total found:", results.length, "/", unique.length);
})();
