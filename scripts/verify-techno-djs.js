const {Discogs, MusicBrainz} = require("./dj-api-clients.js");

const candidates = [
  // ---- Germany / Berlin ----
  {name: "Ben Klock", country: "DE", genres: ["Techno"]},
  {name: "Marcel Dettmann", country: "DE", genres: ["Techno"]},
  {name: "Rødhåd", country: "DE", genres: ["Techno", "Industrial"]},
  {name: "Chris Liebing", country: "DE", genres: ["Techno"]},
  {name: "Len Faki", country: "DE", genres: ["Techno"]},
  {name: "Marcel Fengler", country: "DE", genres: ["Techno"]},
  {name: "Monolake", country: "DE", genres: ["Techno", "Dub Techno"]},
  {name: "Sven Väth", country: "DE", genres: ["Techno", "Trance"]},
  {name: "Paul Kalkbrenner", country: "DE", genres: ["Techno", "Electronic"]},

  // ---- UK / British Techno ----
  {name: "Surgeon", country: "UK", genres: ["Techno", "Industrial"]},
  {name: "Blawan", country: "UK", genres: ["Techno", "Industrial"]},
  {name: "Perc", country: "UK", genres: ["Techno", "Industrial"]},
  {name: "Ben UFO", country: "UK", genres: ["Techno", "Dubstep"]},
  {name: "Regis", country: "UK", genres: ["Techno"]},
  {name: "James Ruskin", country: "UK", genres: ["Techno"]},
  {name: "Luke Slater", country: "UK", genres: ["Techno"]},
  {name: "Slam", country: "UK", genres: ["Techno"]},

  // ---- Detroit / US ----
  {name: "Jeff Mills", country: "US", genres: ["Techno"]},
  {name: "Robert Hood", country: "US", genres: ["Techno", "Minimal"]},
  {name: "Juan Atkins", country: "US", genres: ["Techno"]},
  {name: "Derrick May", country: "US", genres: ["Techno"]},
  {name: "Kevin Saunderson", country: "US", genres: ["Techno"]},
  {name: "DVS1", country: "US", genres: ["Techno"]},

  // ---- Japan ----
  {name: "Ken Ishii", country: "JP", genres: ["Techno"]},
  {name: "DJ Nobu", country: "JP", genres: ["Techno"]},
  {name: "Fumiya Tanaka", country: "JP", genres: ["Techno", "Minimal"]},
  {name: "Takkyu Ishino", country: "JP", genres: ["Techno"]},

  // ---- France ----
  {name: "Laurent Garnier", country: "FR", genres: ["Techno", "House"]},
  {name: "Agoria", country: "FR", genres: ["Techno", "House"]},
  {name: "David August", country: "FR", genres: ["Techno", "Electronic"]},

  // ---- Italy ----
  {name: "Donato Dozzy", country: "IT", genres: ["Techno", "Dub Techno"]},
  {name: "Luigi Tozzi", country: "IT", genres: ["Techno", "Dub Techno"]},
  {name: "Claudio PRC", country: "IT", genres: ["Techno"]},

  // ---- Spain ----
  {name: "Oscar Mulero", country: "ES", genres: ["Techno"]},
  {name: "Christian Wunsch", country: "ES", genres: ["Techno"]},

  // ---- Netherlands ----
  {name: "Speedy J", country: "NL", genres: ["Techno"]},
  {name: "Job Jobse", country: "NL", genres: ["Techno", "House"]},

  // ---- Poland ----
  {name: "Jacek Sienkiewicz", country: "PL", genres: ["Techno"]},

  // ---- Argentina ----
  {name: "Jonas Kopp", country: "AR", genres: ["Techno"]},

  // ---- Belgium ----
  {name: "The Hacker", country: "BE", genres: ["Techno", "Electro"]},

  // ---- Ireland ----
  {name: "Sunil Sharpe", country: "IE", genres: ["Techno"]},

  // ---- Finland ----
  {name: "Samuli Kemppi", country: "FI", genres: ["Techno"]},

  // ---- Australia ----
  {name: "Deepchild", country: "AU", genres: ["Techno", "Dub Techno"]}
];

(async () => {
  console.log("Verifying", candidates.length, "techno artists across", new Set(candidates.map(c => c.country)).size, "countries");
  console.log("");

  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      const [mb, dc] = await Promise.all([
        MusicBrainz.searchArtist(c.name),
        Discogs.searchArtist(c.name)
      ]);
      const mbOk = mb && mb.found;
      const dcOk = dc && dc.found;
      const genres = dc && dc.genres && dc.genres.length ? dc.genres.join(",") : "-";
      const labels = dc && dc.labels && dc.labels.length ? dc.labels.length : 0;
      const bioLen = dc && dc.profile ? dc.profile.length : 0;
      const releaseCount = dc && dc.releaseCount ? dc.releaseCount : 0;
      const mbCountry = mb && mb.country ? mb.country : "-";

      const status = mbOk && dcOk ? "OK   " : (mbOk ? "MB-OK" : "NONE ");
      console.log(
        String(i + 1).padStart(2),
        status,
        c.name.padEnd(22),
        "|",
        c.country,
        "| MB:", mbCountry.padEnd(14),
        "| DC:", String(releaseCount).padStart(3), "releases",
        String(labels).padStart(3), "labels",
        "bio:" + String(bioLen).padStart(5),
        genres.substring(0, 30)
      );

      results.push({
        ...c,
        mbOk, dcOk,
        mbCountry,
        releaseCount, labels, bioLen,
        genres: dc && dc.genres
      });
    } catch (e) {
      console.log(String(i + 1).padStart(2), "ERR  ", c.name, "|", e.message.substring(0, 80));
    }
    await new Promise(r => setTimeout(r, 700));
  }

  console.log("");
  console.log("=");
  const okBoth = results.filter(r => r.mbOk && r.dcOk).length;
  const okEither = results.filter(r => r.mbOk || r.dcOk).length;
  console.log("Both APIs:", okBoth, "/", results.length);
  console.log("At least one:", okEither, "/", results.length);
  console.log("Countries:", new Set(results.filter(r => r.mbOk || r.dcOk).map(r => r.country)).size);

  // Group by country
  console.log("");
  console.log("==== Country summary ====");
  const byCountry = {};
  for (const r of results.filter(r => r.mbOk || r.dcOk)) {
    if (!byCountry[r.country]) byCountry[r.country] = [];
    byCountry[r.country].push(r.name + "(" + r.releaseCount + "rel, bio:" + r.bioLen + ")");
  }
  for (const country of Object.keys(byCountry).sort()) {
    console.log(" " + country + ": " + byCountry[country].join(", "));
  }
})();
