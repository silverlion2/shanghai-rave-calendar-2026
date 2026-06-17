---
name: "poster-upload"
description: "Replaces and uploads rave calendar poster images safely to GitHub/Vercel. Invoke when user asks to replace, upload, swap, or update event posters / 海报 / flyer images in the shanghai-rave-calendar-2026 project. Includes format validation, user-visible pre-push confirmation, Vercel CDN verification, and cache-busting guidance."
---

# Poster Upload Skill

This skill standardizes the workflow for replacing poster images in the
`shanghai-rave-calendar-2026` project. It was created after a series of real
failures and now bakes in every lesson learned:

1. A poster that was actually a PNG (file header `89 50 4E 47`) was saved
   with a `.jpg` extension, and the browser silently failed to render it
   (showing a placeholder). **Never trust the file extension.**
2. Poster content was sometimes wrong because the source image was a
   **carousel/slide thumbnail** taken from a Weixin article, not the actual
   event poster. **Always read the image back to the user for visual
   confirmation before pushing.**
3. After pushing, the Vercel CDN sometimes still served stale images to
   some browsers while others got the new image. **Always verify the bytes
   Vercel actually serves, and tell the user to hard-refresh.**

## When to invoke

Invoke this skill whenever the user asks to:
- Replace / swap / update one or more event poster images
- Upload new posters / 海报 / flyers
- Refresh the "latest 3 uploaded posters"
- Fix wrong / broken / placeholder posters on the live site
- Investigate "browser A shows X, browser B shows Y" cache-mismatch issues

## Hard rules (read before doing anything)

1. **NEVER trust the file extension.** Weixin, WeChat, browsers, and
   clipboard exports routinely save JPEG bytes as `.png` or PNG bytes as
   `.jpg`. Always verify the actual format with the magic bytes, and always
   normalize to real JPEG before saving into `assets/posters/`.
2. **NEVER trust that a Weixin / 小红书 / 公众号 image is the actual
   poster.** It is almost always a carousel slide, a screenshot of the
   article, or a thumbnail. **Read it back to the user and ask them to
   confirm it is the actual poster before pushing.** A wrong image pushed
   to main will be hard to recover from because Vercel CDN may keep serving
   it for hours/days.
3. **ALWAYS keep a backup of the source image** in `assets/posters/` with
   a leading-underscore name (e.g. `_oscar-source-backup.png`) until the
   final push is confirmed. Do **not** commit the backup.
4. **ALWAYS update `data/poster-archive.json` and `events/*.html` SEO
   pages** after replacing images, otherwise the live site will keep
   showing stale references.
5. **ALWAYS verify the push landed on `origin/main`** with
   `git ls-remote origin main` before telling the user it is done.
6. **ALWAYS verify the bytes Vercel actually serves** match the new local
   files (use the verify-asset-hashes command in step 8) before declaring
   the task complete. If a CDN node serves a stale image, that means
   someone, somewhere, will see the wrong picture.
7. **ALWAYS tell the user to hard-refresh** (`Ctrl+Shift+R` /
   `Cmd+Shift+R`) and offer the incognito-window fallback. If they report
   "two browsers show different images," escalate to a `Cache-Control`
   header change in `vercel.json` and a fresh redeploy (see step 9).
8. **NEVER commit temporary verification files** (`_check-*.jpg`,
   `_check-*.js`, `_verify-*.js`, `_ocr*.js`, `_oscar-source-backup.*`,
   `_patch-*.svg`, etc.) to the repo. Delete them before the commit.
9. **ALWAYS run OCR on every source image BEFORE deciding which event it
   belongs to.** Run `tesseract <image> stdout -l chi_sim+eng --psm 6`
   (or the node equivalent) to extract the text. Use the extracted text
   — artist name, date, venue, ticket info — to match the image against
   `data/events.json`. **Never guess or assume from the filename alone.**
   The filename is almost always wrong. The OCR text is the source of
   truth for which event the poster belongs to.

## Step-by-step workflow

### 1. Identify the source images

Ask the user for the source images. They usually live in `D:\` (e.g.
`Weixin Image_<timestamp>_<id>_<idx>.{jpg,png}`). Use `Glob` with
`**/Weixin*` to find them.

### 2. Run OCR on every source image — ALWAYS before any other processing

This is the most important correctness check. The filename tells you nothing.
The OCR text tells you the truth.

```powershell
# Install tesseract (one-time): winget install --id UB-Mannheim.TesseractOCR -e ...
# Then set up tessdata (see Quick verification commands -> C for full setup)
$env:TESSDATA_PREFIX = $env:USERPROFILE
& "C:\Program Files\Tesseract-OCR\tesseract.exe" "D:\some-poster.jpg" stdout -l chi_sim+eng --psm 6
```

```javascript
// Or use node: node _ocr.js <image-path>
// _ocr.js uses tesseract via child_process
const { execFileSync } = require('child_process');
const text = execFileSync('C:\\Program Files\\Tesseract-OCR\\tesseract.exe', [process.argv[2], 'stdout', '-l', 'chi_sim+eng', '--psm', '6'],
  { env: { ...process.env, TESSDATA_PREFIX: process.env.USERPROFILE } }).toString();
console.log(text);
```

From the OCR output, extract:
- **Artist / DJ name(s)** — e.g. "MALAA", "OSCARZ", "酸儿辣女"
- **Date** — e.g. "JUN 20", "6月26日", "2026.06.19"
- **Venue** — e.g. "MAX Shanghai", "MiM Club", "PARK"
- **Promoter / brand** — e.g. "MAXIMUM EFFORT", "PARKLIFE", "YuYuan"
- **Ticket / lineup hints** — any price, artist names, or ticket links

Then search `data/events.json` for matching events:

```powershell
cd "D:\workspace\rave calendar"
node -e "const j=require('./data/events.json');const q=process.argv[1];const r=j.events.filter(e=>JSON.stringify(e).toLowerCase().includes(q.toLowerCase()));console.log(JSON.stringify(r.map(e=>({id:e.id,title:e.title,date:e.date,venue:e.venue})),null,2));" "MALAA"
```

Use the **shortest unambiguous token** — the artist name (MALAA) is
usually safer than the venue (PARK) because `PARK` matches a dozen
other events. If the first search is ambiguous, narrow by adding more
tokens (e.g. "C·PARK" for 酸儿辣女).

**Report to the user:**
> "OCR reads: [artist name], [date], [venue]. This matches event
> `[id]` — [title]. Is this the correct event?"

If the user says yes, proceed. If the user says no, ask which event it
belongs to and update the search. **Do not proceed until the user
confirms the event match.**

### 3. Copy the source images into a temp location inside the project

Copy the source into `assets/posters/_<event-id>-source-backup.<ext>`
(leading underscore = not tracked by git, not committed). Keep the
original extension and format intact for now.

```powershell
Copy-Item "D:\Weixin Image_20260616235116_199_2.png" "D:\workspace\rave calendar\assets\posters\_oscar-source-backup.png" -Force
```

### 4. Read the source image to the user and ask for confirmation

**This is the most important step.** Use the `Read` tool on the backup
file and let the user see the image. Ask explicitly:

> "Is this the actual event poster, or is it a Weixin article screenshot /
> carousel slide / thumbnail?"

If the user says it is wrong, do not proceed. If they say "use this,"
continue. If they want to crop the screenshot down to the poster region,
do that next (step 5).

### 5. (Optional) Crop the source down to the poster region

If the source is a screenshot of a Weixin article, crop out the iOS
status bar, the article's nav bar, the 2/2 page indicator, the article
footer, and the comment bar. Use `sharp.extract` and a small SVG patch
to clean up a `2/2` badge. **Never trim away the brand mark, the artist
name, or the event date** — those are the visual proof of which event the
poster is for.

```javascript
// Example: crop 1170x2532 YuYuan screenshot to the OSCARZ poster region
const sharp = require('sharp');
const fs = require('fs');
(async () => {
  const src = 'assets/posters/_oscar-source-backup.png';
  const meta = await sharp(src).metadata();
  const W = meta.width, H = meta.height;
  const top = Math.round(H * 0.135);    // past the YuYuan nav bar
  const bottom = Math.round(H * 0.715); // before the YuYuan footer
  const buf = await sharp(src)
    .extract({ left: 0, top, width: W, height: bottom - top })
    .jpeg({ quality: 92 })
    .toBuffer();
  const out = 'assets/posters/oscar-l-mim-club.jpg';
  fs.writeFileSync(out + '.tmp', buf);
  fs.renameSync(out + '.tmp', out);
})();
```

If you need to mask a `2/2` page badge, composite a small SVG with a
radial gradient that matches the poster's background color (sample a
neighboring pixel first to get the exact RGB).

### 6. Read the cropped output back to the user

Use the `Read` tool on the cropped `assets/posters/<id>.jpg` and let the
user see it. Ask "does this look right?" before generating the
`-optimized.jpg` derivative. **This second confirmation catches bugs the
first one missed** (e.g. you accidentally cropped the wrong region, or
the patch color is off).

### 7. Verify the file format, then generate the optimized derivative

```powershell
cd "D:\workspace\rave calendar"
node scripts/optimize-posters.js --force assets/posters/<id>.jpg
```

If the format-verify step in the original skill flagged anything, fix it
first (re-encode the source with `sharp` so the magic bytes are real
JPEG, not PNG-as-JPG).

### 8. Refresh poster archive and SEO pages

```powershell
node scripts/generate-poster-archive.js
node scripts/generate-seo-pages.js
```

### 9. Pre-push local sanity check

Run the format / content verifier and compare with the user's confirmed
backup:

```javascript
// _verify-posters.js (DELETE BEFORE COMMITTING)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const files = process.argv.slice(2);
(async () => {
  for (const f of files) {
    const full = path.resolve(f);
    const buf = fs.readFileSync(full);
    const magic = buf.slice(0, 4).toString('hex');
    const meta = await sharp(full).metadata();
    const stats = await sharp(full).stats();
    const mean = stats.channels.map(c => Math.round(c.mean));
    const isJpeg = ['ffd8ffe0','ffd8ffe1','ffd8ffdb'].includes(magic);
    console.log(`${f}  magic=${magic}  ${isJpeg?'JPEG':'BAD'}  ${meta.width}x${meta.height}  mean(rgb)=${mean.join(',')}  size=${buf.length}`);
  }
})();
```

Then `node _verify-posters.js assets/posters/<id>.jpg assets/posters/<id>-optimized.jpg`
and confirm:

- Both files are JPEG (`magic=ffd8ff...`)
- Both files have the same mean RGB (within ~5/channel)
- The mean RGB matches what the user described (blue poster ≈ 26,70,93;
  warm poster ≈ 156,124,102; etc.)

### 10. Clean up temporary files, commit, push

```powershell
Remove-Item _verify-posters.js, "assets\posters\_<id>-source-backup.*", "assets\posters\_patch-*.svg" -ErrorAction SilentlyContinue
cd "D:\workspace\rave calendar"
git status
git add assets/posters/<id>.jpg assets/posters/<id>-optimized.jpg data/poster-archive.json events/<id>.html
git commit -m "Fix: replace <id> poster with <short description>"
git push origin main
git ls-remote origin main
```

Use `git add <specific files>` rather than `git add -A` so that stray
temporary files do not sneak in.

### 11. Verify the bytes Vercel actually serves

**This step catches the "two browsers show different pictures" bug.**
After Vercel redeploys (1-2 minutes), fetch each image from the live
domain and compare its MD5 to the local file:

```javascript
// _check-asset-hashes.js (DELETE BEFORE COMMITTING)
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Cache-Control': 'no-cache' } }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve({ buf: Buffer.concat(chunks), status: r.statusCode, headers: r.headers }));
      r.on('error', reject);
    });
  });
}

(async () => {
  const targets = [
    'oscar-l-mim-club.jpg',
    'oscar-l-mim-club-optimized.jpg',
    // ...other touched files
  ];
  for (const f of targets) {
    const r = await fetch('https://raveindexsh.top/assets/posters/' + f);
    const md5 = crypto.createHash('md5').update(r.buf).digest('hex');
    const localMd5 = crypto.createHash('md5').update(fs.readFileSync('assets/posters/' + f)).digest('hex');
    console.log(f, '| vercel md5:', md5, '| local md5:', localMd5, '| match:', md5 === localMd5, '| age:', r.headers.age || 'none');
  }
})();
```

If the Vercel MD5s match the local MD5s, the new image is live. If they
do not match (and the Vercel `age` is `0`, meaning it was a fresh
fetch), it means Vercel has not redeployed yet — wait another minute and
retry.

### 12. If different browsers show different pictures

This is the "CDN cache skew" symptom. Escalation steps in order:

1. **Tell the user to hard-refresh both browsers** (`Ctrl+Shift+R`) and
   to try an incognito window. If that fixes it, the problem was local
   browser cache and we're done.
2. **Tell the user to clear site data** in both browsers (DevTools →
   Application → Clear storage → "Clear site data"). This wipes
   Service Worker caches and Disk Cache.
3. **Wait 5 minutes.** The default `Cache-Control` for `/assets/*` in
   `vercel.json` was `public, max-age=604800` (7 days). Some Vercel
   edge nodes may keep serving the old file until the TTL expires.
4. **If still inconsistent, shorten the `Cache-Control` TTL.** Edit
   `vercel.json`:

   ```json
   {
     "source": "/assets/(.*)",
     "headers": [
       { "key": "Cache-Control", "value": "public, max-age=300, stale-while-revalidate=86400" }
     ]
   },
   {
     "source": "/data/(.*)",
     "headers": [
       { "key": "Cache-Control", "value": "public, max-age=60, stale-while-revalidate=86400" }
     ]
   }
   ```

   Then commit, push, and wait 1-2 minutes. After this change, all
   Vercel CDN nodes will discard stale images within 5 minutes
   (`/assets`) or 1 minute (`/data`).
5. **If still inconsistent after that, give the URL a version query
   string.** Update the `posterUrl` in `data/events.json` from
   `assets/posters/<id>.jpg` to `assets/posters/<id>.jpg?v=<commit>`.
   The new URL bypasses every layer of cache.

### 13. Tell the user the result

In the final reply to the user, include:

- The commit hash that is now on `origin/main` (`git ls-remote origin main`).
- The Vercel MD5 of each new image (proving the live site is serving
  the new bytes).
- A reminder to hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
- A reminder that Vercel CDN takes up to 5 minutes to converge across
  edge nodes.
- A fallback: if they still see a mismatch, open the site in an
  incognito window (which has no persistent cache).

## What went wrong last time (and why this skill exists)

### Failure 1: PNG-as-JPG extension mismatch

- Three new posters were copied from `D:\` into `assets/posters/`.
- Two of them were PNGs that Windows / the source app had saved with
  `.jpg` extensions.
- The optimizer script happily generated `-optimized.jpg` derivatives
  from the wrong source format, so the local commit and GitHub push
  looked fine.
- In the browser, the cards showed the "image is generating" placeholder
  because the broken MIME caused the request to fail.
- **Fix**: detect the bad header with magic-byte check, re-encode the
  source with `sharp`, re-run the optimizer, re-run archive + SEO, push
  again.

### Failure 2: Weixin carousel slide mistaken for the real poster

- The user gave us three images thinking they were the real posters.
- They were actually **carousel slides** from a Weixin article — the
  OSCARZ image was a crop of the 2nd slide in a 2-slide carousel, and
  the MALAA / 酸儿辣女 images were similarly cropped or stylised.
- We pushed, the GitHub commit succeeded, but the user looked at the
  live site and the cards were "all wrong."
- **Fix**: there is no good programmatic fix for this. The skill now
  requires **two human-in-the-loop Read confirmations** (once on the
  source, once on the cropped output) before the push.

### Failure 3: Vercel CDN serving stale images to some browsers

- After pushing new poster files, the user saw the new image in
  browser B and the old image in browser A.
- We confirmed the Vercel CDN was serving the new image (MD5 of the
  fetched asset matched the local file), but their browser A still
  had the old image in its disk cache / Service Worker cache.
- **Fix**: the skill now (a) tells the user to hard-refresh, (b) tells
  them to try an incognito window, (c) tells them to clear site data
  in DevTools, and (d) escalates to shortening the `Cache-Control`
  TTL in `vercel.json` so Vercel stops caching for 7 days.

### Failure 4: filename-vs-content mismatch — OCR is the source of truth

- The user gave us several Weixin/JPEG exports and we named them
  after whichever event the filename or our first guess implied.
- Several files were actually **carousels/screenshots of the wrong
  event** (e.g. an image whose filename hinted "MALAA" actually showed
  the OSCARZ poster, or vice versa). We pushed, the GitHub commit
  succeeded, and the live site ended up with the wrong picture on the
  wrong card.
- **Fix**: the skill now mandates running **OCR on every source image
  before assigning it to an event**. The OCR text — artist name, date,
  venue, ticket line — is the only thing that decides which event the
  poster belongs to. The filename is ignored. If the OCR text doesn't
  match any `data/events.json` entry (or matches the *wrong* one), the
  user is asked which event it actually is before any further work.

## Quick verification commands

### A. Detect extension-vs-format mismatches in `assets/posters/`

```powershell
Get-ChildItem "D:\workspace\rave calendar\assets\posters\*.jpg" | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)[0..3] | %{ '{0:X2}' -f $_ }
  $magic = $b -join ''
  $kind = switch -Regex ($magic) { '^FFD8' { 'JPEG' } '^89504E47' { 'PNG-as-JPG (BAD)' } default { 'OTHER' } }
  if ($kind -ne 'JPEG') { Write-Output "$($_.Name) -> $kind" }
}
```

Any output is a bug that must be fixed before pushing.

### B. Check that Vercel is serving the new image bytes

```powershell
node -e "const https=require('https');const crypto=require('crypto');const fs=require('fs');https.get('https://raveindexsh.top/assets/posters/<id>-optimized.jpg',r=>{const c=[];r.on('data',x=>c.push(x));r.on('end',()=>{const b=Buffer.concat(c);const remote=crypto.createHash('md5').update(b).digest('hex');const local=crypto.createHash('md5').update(fs.readFileSync('assets/posters/<id>-optimized.jpg')).digest('hex');console.log('remote:',remote,'local:',local,'match:',remote===local);});});"
```

If `match: false`, Vercel has not redeployed yet — wait 1-2 minutes
and retry.

### C. Run OCR on a source image to identify which event it belongs to

This is the **first step** of every new poster upload — never skip it.

**Install (Windows, one-time):**

```powershell
winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements
```

Tesseract is installed at `C:\Program Files\Tesseract-OCR\tesseract.exe`.
The bundled tessdata only ships `eng.traineddata`. For Chinese support
(`-l chi_sim+eng`), the user must download `chi_sim.traineddata` into
the same `tessdata\` directory (or into a writable folder and point
`$env:TESSDATA_PREFIX` at it). `C:\Program Files\` is read-only, so the
practical setup is:

```powershell
# One-time: copy eng + chi_sim into a writable folder
Copy-Item "C:\Program Files\Tesseract-OCR\tessdata\eng.traineddata" "$env:USERPROFILE\eng.traineddata" -Force
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata_fast/raw/main/chi_sim.traineddata" -OutFile "$env:USERPROFILE\chi_sim.traineddata" -UseBasicParsing
```

**Run:**

```powershell
$env:TESSDATA_PREFIX = $env:USERPROFILE
& "C:\Program Files\Tesseract-OCR\tesseract.exe" "D:\some-poster.jpg" stdout -l chi_sim+eng --psm 3
```

`--psm 3` (default) is usually best for full posters. Try `--psm 6`
(assume a single uniform block) if the layout is column-based. Try
`--psm 11` (sparse text) if the poster has lots of empty space.

**Look for these tokens in the output to match an event:**

| What you want to find | Regex to look for                |
| --------------------- | -------------------------------- |
| Artist / DJ name      | `[A-Z]{3,}` or `酸儿辣女` etc.    |
| Date                  | `(JAN\|FEB\|MAR\|APR\|MAY\|JUN\|JUL\|AUG\|SEP\|OCT\|NOV\|DEC)\.?\s+\d+` |
| Chinese date          | `\d+月\d+日`                     |
| Venue                 | `MAX Shanghai`, `MiM`, `PARK`, etc. |
| Promoter              | `MAXIMUM EFFORT`, `PARKLIFE`, etc. |
| Ticket / xhs          | `小红书号`, `Ticket`, `预售`      |

**Then look the tokens up in `data/events.json`:**

```powershell
cd "D:\workspace\rave calendar"
node -e "const j=require('./data/events.json');const q=process.argv[1];const r=j.events.filter(e=>JSON.stringify(e).toLowerCase().includes(q.toLowerCase()));console.log(JSON.stringify(r.map(e=>({id:e.id,title:e.title,date:e.date,venue:e.venue})),null,2));" "MALAA"
```

**Report the match to the user and wait for confirmation** before
proceeding to copy / crop / push.
