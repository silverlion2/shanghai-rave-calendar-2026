import requests
from PIL import Image
import io

def download_image(url):
    print(f"Downloading {url}...")
    response = requests.get(url, timeout=30)
    return Image.open(io.BytesIO(response.content))

def save_optimized(img, path, crop_box=None):
    if crop_box:
        img = img.crop(crop_box)
    img = img.convert("RGB")
    img.save(path, "JPEG", quality=85, optimize=True)
    print(f"Saved: {path} ({img.size})")

malaa_url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=MALAA%20masked%20DJ%20G-house%20dark%20red%20background%20professional%20club%20poster%20dramatic%20lighting%202026%20MAX%20Shanghai&image_size=portrait_4_3"
suaner_url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20electronic%20music%20party%20poster%20Guizhou%20kitchen%20food%20theme%20pink%20blue%20grid%20background%20modern%20graphic%20design%20frying%20pan%20fire&image_size=portrait_4_3"
oscar_url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Oscar%20L%20Spanish%20DJ%20producer%20techno%20artist%20portrait%20blue%20gradient%20background%20professional%20electronic%20music%20poster%20dark%20moody%20lighting&image_size=portrait_4_3"

malaa_img = download_image(malaa_url)
suaner_img = download_image(suaner_url)
oscar_img = download_image(oscar_url)

save_optimized(malaa_img, "assets/posters/malaa-max-shanghai-optimized.jpg")
save_optimized(suaner_img, "assets/posters/suaner-lanv-guizhou-kitchen-optimized.jpg")

oscar_crop = (0, 50, oscar_img.width, oscar_img.height - 150)
save_optimized(oscar_img, "assets/posters/oscar-l-mim-club-optimized.jpg", oscar_crop)

print("All posters saved!")