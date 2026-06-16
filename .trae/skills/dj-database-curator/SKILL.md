---
name: "dj-database-curator"
description: "Curates and manages DJ profiles in the rave calendar database. Invoke when user asks to add DJs, curate DJ database, or manage tracked DJ profiles."
---

# DJ Database Curator

Manages DJ profiles in `config/tracked-dj-profiles.json` with local thumbnail photos in `assets/dj-photos/`.

## Workflow

### 1. Adding New DJ Profiles

When adding DJs (e.g., top techno DJs):

**DJ Profile Structure:**
```json
{
  "id": "charlotte-de-witte",
  "name": "Charlotte de Witte",
  "country": "Belgium",
  "genres": ["techno", "hard techno"],
  "imageTheme": "dark-violet",
  "imageUrl": "assets/dj-photos/charlotte-de-witte.jpg",
  "bio": "Belgian DJ/producer, #1 techno DJ according to 2024 DJ Mag rankings.",
  "links": {
    "ra": "https://ra.co/dj/charlottedewitte",
    "djmag": "https://djmag.com/profile/charlotte-de-witte"
  },
  "sources": ["RA", "DJ Mag 2024", "EDMDanceDirectory"]
}
```

**Adding Process:**
1. Research DJ info (genre, country, bio, links)
2. Create JSON profile entry
3. Download thumbnail photo from Unsplash or official sources
4. Save photo to `assets/dj-photos/<dj-id>.jpg`
5. Update `config/tracked-dj-profiles.json`
6. Commit and push changes

### 2. Poster/Event Image Handling

When creating event posters from user screenshots:

**For screenshots with UI elements (WeChat, etc.):**
- Crop to remove UI before saving
- Target size: 800x1000 pixels (portrait)
- Save as JPEG with quality 85, optimized

**Image generation/cropping script:**
```python
from PIL import Image

def crop_and_save(input_path, output_path, crop_box=None):
    img = Image.open(input_path)
    if crop_box:
        img = img.crop(crop_box)
    img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=85, optimize=True)
```

### 3. Git Workflow

```bash
git checkout -b add-dj-profiles
git add config/tracked-dj-profiles.json
git add assets/dj-photos/
git commit -m "Add [N] [genre] DJ profiles with photos"
git push origin add-dj-profiles
# Then merge to main via PR or direct merge
git checkout main
git merge add-dj-profiles
git push origin main
```

## File Locations

| Purpose | Path |
|---------|------|
| DJ Profiles | `config/tracked-dj-profiles.json` |
| DJ Photos | `assets/dj-photos/` |
| Event Posters | `assets/posters/` |
| Curated Events | `config/curated-events.json` |

## Common Tasks

- **Add top techno DJs**: Research top 20 international techno artists, add profiles with Unsplash photos
- **Fix event posters**: Download user screenshots, crop UI elements, optimize for web
- **Update DJ info**: Edit bio, links, or genres in tracked-dj-profiles.json
