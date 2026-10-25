import os
import glob
from PIL import Image

WATERMARK_PATH = "C:/Users/admin/.gemini/antigravity/brain/d3478cdc-363b-498d-be73-996dbfa02639/.user_uploaded/media_1792905862588_b2274539.png"
ARTIFACT_DIR = "C:/Users/admin/.gemini/antigravity/brain/d3478cdc-363b-498d-be73-996dbfa02639/screenshots"
LOCAL_DIR = "d:/My Project/Augg_que/screenshots"
ORIG_DIR = os.path.join(LOCAL_DIR, "original")

def apply_watermark(image_path, output_path, cropped_wm, opacity=0.30):
    base_img = Image.open(image_path).convert("RGBA")
    w, h = base_img.size

    overlay = Image.new("RGBA", base_img.size, (0, 0, 0, 0))

    if h > w * 1.6:
        # Tall mobile screen: place two watermarks for balanced protection (upper-mid and lower-mid)
        target_wm_width = int(w * 0.72)
        aspect = cropped_wm.height / cropped_wm.width
        target_wm_height = int(target_wm_width * aspect)
        resized_wm = cropped_wm.resize((target_wm_width, target_wm_height), Image.Resampling.LANCZOS)

        r, g, b, a = resized_wm.split()
        a = a.point(lambda p: int(p * opacity))
        faint_wm = Image.merge("RGBA", (r, g, b, a))

        pos_x = (w - target_wm_width) // 2
        pos_y1 = int(h * 0.35) - (target_wm_height // 2)
        pos_y2 = int(h * 0.70) - (target_wm_height // 2)

        overlay.paste(faint_wm, (pos_x, pos_y1), faint_wm)
        overlay.paste(faint_wm, (pos_x, pos_y2), faint_wm)
    else:
        # Desktop screen: place prominent centered watermark
        target_wm_width = int(w * 0.52)
        aspect = cropped_wm.height / cropped_wm.width
        target_wm_height = int(target_wm_width * aspect)
        resized_wm = cropped_wm.resize((target_wm_width, target_wm_height), Image.Resampling.LANCZOS)

        r, g, b, a = resized_wm.split()
        a = a.point(lambda p: int(p * opacity))
        faint_wm = Image.merge("RGBA", (r, g, b, a))

        pos_x = (w - target_wm_width) // 2
        pos_y = (h - target_wm_height) // 2

        overlay.paste(faint_wm, (pos_x, pos_y), faint_wm)

    watermarked = Image.alpha_composite(base_img, overlay)
    watermarked.convert("RGB").save(output_path, "PNG", quality=95)
    print(f"Applied watermark to {os.path.basename(output_path)}")

def main():
    wm_img = Image.open(WATERMARK_PATH)
    bbox = wm_img.getbbox()
    cropped_wm = wm_img.crop(bbox)

    files = glob.glob(os.path.join(ORIG_DIR, "*.png"))
    for f in files:
        fname = os.path.basename(f)
        out_local = os.path.join(LOCAL_DIR, fname)
        out_artifact = os.path.join(ARTIFACT_DIR, fname)
        apply_watermark(f, out_local, cropped_wm, opacity=0.30)
        apply_watermark(f, out_artifact, cropped_wm, opacity=0.30)

    print("🎉 All images watermarked successfully!")

if __name__ == "__main__":
    main()
