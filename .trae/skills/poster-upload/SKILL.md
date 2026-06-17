---
name: "poster-upload"
description: "Replaces and uploads rave calendar poster images safely to GitHub/Vercel. Invoke when user asks to replace, upload, swap, or update event posters / 海报 / flyer images in the shanghai-rave-calendar-2026 project."
---

# Poster Upload Skill

This skill standardizes the workflow for replacing poster images in the
`shanghai-rave-calendar-2026` project. It was created after a real failure
where a poster that was actually a PNG (file header `89 50 4E 47`) was saved
with a `.jpg` extension, and the browser silently failed to render it
(showing a placeholder). The skill prevents that exact mistake.

## When to invoke

Invoke this skill whenever the user asks to:
- Replace / swap / update one or more event poster images
- Upload new posters / 海报 / flyers
- Refresh the "latest 3 uploaded posters"
- Fix wrong / broken / placeholder posters on the live site

## Hard rules (read before doing anything)

1. **NEVER trust the file extension.** Weixin, WeChat, browsers, and clipboard
   exports routinely save JPEG bytes as `.png` or PNG bytes as `.jpg`. Always
   verify the actual format with the magic bytes.
2. **Always normalize to real JPEG** before saving into `assets/posters/`
   and before generating `-optimized.jpg` derivatives. A `.jpg` file whose
   first bytes are `89 50 4E 47` is a PNG and will not render correctly in
   the browser even though the path is correct.
3. **Always update `data/poster-archive.json` and `events/*.html` SEO pages**
   after replacing images, otherwise the live site will keep showing stale
   references.
4. **Always verify the push landed on `origin/main`** with
   `git ls-remote origin main` before telling the user it is done.
5. **Always tell the user to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R)**
   to bypass Vercel + browser cache.

## Step-by-step workflow

### 1. Copy the source images into the project

```powershell
Copy-Item "D:\some-source-folder\*.jpg" "D:\workspace\rave calendar\assets\posters\" -Force
```

### 2. Verify and normalize the file format (MANDATORY)

Run this from the project root for every newly copied file. It will:
- detect the actual MIME by reading the first 4 bytes
- reject PNG/PNG-as-JPG mismatches
- re-encode the file as a true JPEG (rotation-stripped, quality 90)

```powershell
node -e "const sharp=require('sharp');const fs=require('fs');const path=require('path');(async()=>{const files=process.argv.slice(1);for(const f of files){const buf=fs.readFileSync(f);const magic=buf.slice(0,4).toString('hex');if(magic!=='ffd8ffe0'&&magic!=='ffd8ffe1'&&magic!=='ffd8ffdb'){const out=await sharp(f).rotate().jpeg({quality:90}).toBuffer();const tmp=f+'.tmp.jpg';fs.writeFileSync(tmp,out);fs.renameSync(tmp,f);console.log('NORMALIZED '+f+' (was '+magic+') -> real JPEG, '+out.length+' bytes');}else{console.log('OK '+f+' (already real JPEG)');}}})();" assets/posters/<file1>.jpg assets/posters/<file2>.jpg
```

If the `fs.writeFileSync` to the destination fails with `UNKNOWN: unknown
error`, the file is locked. Write to a `.tmp.jpg` first, then `fs.renameSync`
it over the original. The script above already does this.

### 3. Re-generate the optimized derivative

```powershell
cd "D:\workspace\rave calendar"
node scripts/optimize-posters.js --force assets/posters/<file1>.jpg assets/posters/<file2>.jpg ...
```

This writes the matching `*-optimized.jpg` that the site actually displays in
the poster wall and event cards.

### 4. Refresh poster archive and SEO pages

```powershell
node scripts/generate-poster-archive.js
node scripts/generate-seo-pages.js
```

### 5. Update JSON references if the filenames are new

Only needed if the user gave you images with names that do not already exist
in `data/events.json`. Search for the matching event id and update
`posterUrl`, `posterEvidence.url`, and any `*-optimized.jpg` references so
they all point at the new file names.

### 6. Commit and push

```powershell
git add -A
git commit -m "Replace posters: <short description>"
git push origin main
```

### 7. Verify the push

```powershell
git ls-remote origin main
```

Confirm the printed commit hash matches the one you just pushed. If it does
not, retry with `git push --set-upstream origin main --force-with-lease`
and then re-check.

### 8. Tell the user

- State the commit hash you just pushed.
- Tell the user to hard-refresh (`Ctrl+Shift+R` on Windows/Linux,
  `Cmd+Shift+R` on macOS) to bypass Vercel + browser cache.
- Mention that Vercel usually redeploys within 1-2 minutes.

## What went wrong last time (and why this skill exists)

- Three new posters were copied from `D:\` into `assets/posters/`.
- Two of them were PNGs that Windows / the source app had saved with `.jpg`
  extensions.
- The optimizer script happily generated `-optimized.jpg` derivatives from
  the wrong source format, so the local commit and GitHub push looked fine.
- In the browser, the cards showed the "image is generating" placeholder
  because the broken MIME caused the request to fail.
- We had to: detect the bad header, re-encode the source with `sharp`,
  re-run the optimizer, re-run archive + SEO, and push again.

This skill makes the format-check step non-optional.

## Quick verification command

If you ever need to check whether a poster directory has any
extension-vs-format mismatches, run this:

```powershell
Get-ChildItem "D:\workspace\rave calendar\assets\posters\*.jpg" | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)[0..3] | %{ '{0:X2}' -f $_ }
  $magic = $b -join ''
  $kind = switch -Regex ($magic) { '^FFD8' { 'JPEG' } '^89504E47' { 'PNG-as-JPG (BAD)' } default { 'OTHER' } }
  if ($kind -ne 'JPEG') { Write-Output "$($_.Name) -> $kind" }
}
```

Any output from this command is a bug that must be fixed before pushing.
