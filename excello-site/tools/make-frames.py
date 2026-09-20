#!/usr/bin/env python3
"""
make-frames.py — turn a video (or an existing frame folder) into a small,
scroll-scrubbable WebP frame sequence for the hero / band animations.

The site's frame-scrub engine (js/main.js) loads f_001.webp, f_002.webp, ...
from a folder and paints them onto a <canvas> as you scroll. Fewer + smaller +
more-compressed frames = a much lighter download that still scrubs smoothly.

USAGE
-----
From a video:
    python3 tools/make-frames.py --video path/to/clip.mp4 --out img/hero-seq \
        --count 100 --width 1280 --quality 52

From an existing folder of frames (any f_*.png/webp/jpg):
    python3 tools/make-frames.py --src some/frames --out img/clip-seq \
        --count 72 --width 1200 --quality 46

Then point the markup at it in index.html, e.g.:
    data-seq="img/hero-seq" data-frames="100"   (use the count printed below)

TIPS FOR MINIMUM SIZE
    - count:   90-110 is plenty for a smooth scrub. Lower = smaller.
    - width:   1200-1440 for a full-bleed background. Lower = smaller.
    - quality: 45-60. Detailed / construction footage compresses worse, so
               drop quality a little more for those.
"""
import argparse, os, glob, sys, subprocess, tempfile, shutil

def ffmpeg_exe():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg not found. Install it, or `pip install imageio-ffmpeg`.")

def extract_video(video, tmp):
    # Dump every frame as PNG; we resample to --count afterwards.
    out = os.path.join(tmp, "src_%05d.png")
    subprocess.run([ffmpeg_exe(), "-i", video, "-vsync", "0", out],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return sorted(glob.glob(os.path.join(tmp, "src_*.png")))

def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--video", help="source video file")
    g.add_argument("--src", help="folder of existing frames (f_*.png/webp/jpg)")
    ap.add_argument("--out", required=True, help="output folder, e.g. img/hero-seq")
    ap.add_argument("--count", type=int, default=100, help="number of output frames")
    ap.add_argument("--width", type=int, default=1280, help="output width in px")
    ap.add_argument("--quality", type=int, default=52, help="WebP quality 1-100")
    a = ap.parse_args()

    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow not found. Run: pip install pillow")

    tmp = tempfile.mkdtemp()
    try:
        if a.video:
            srcs = extract_video(a.video, tmp)
        else:
            srcs = sorted(glob.glob(os.path.join(a.src, "f_*.*")))
        if not srcs:
            sys.exit("No source frames found.")

        os.makedirs(a.out, exist_ok=True)
        for f in glob.glob(os.path.join(a.out, "*.webp")):
            os.remove(f)

        n, total = len(srcs), 0
        count = min(a.count, n)
        for i in range(count):
            idx = round(i * (n - 1) / (count - 1)) if count > 1 else 0
            im = Image.open(srcs[idx]).convert("RGB")
            if im.width > a.width:
                im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
            dst = os.path.join(a.out, "f_%03d.webp" % (i + 1))
            im.save(dst, "WEBP", quality=a.quality, method=6)
            total += os.path.getsize(dst)

        print("Wrote %d frames to %s" % (count, a.out))
        print("Total size: %.2f MB (avg %.1f KB/frame)" % (total / 1048576, total / count / 1024))
        print('Set the markup to: data-seq="%s" data-frames="%d"' % (a.out, count))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    main()
