"""Cuts the film's camera clips and the app's sample tour stills from openly licensed footage.

    uv run python3 scripts/clips.py

Each clip is a short slice, cropped to the phone's portrait screen, slowed, then played forward
and back so it covers a whole stop. The stills are full frames, so the sample tour can pan them.
Sources and licenses are listed in public/clips/README.md. Needs ffmpeg.
"""

import subprocess
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sources = root / "out/sources"
clips = root / "public/clips"
rooms = root.parent / "public/rooms"

footage = {
    "laundry": "https://upload.wikimedia.org/wikipedia/commons/a/a2/The_washing_machine_that_is_being_operated.webm",
    "apartment": "https://upload.wikimedia.org/wikipedia/commons/f/fa/UE4Arch.com_-_Viennese_apartment.webm",
}

# Matches the app's 390 x 844 screen.
PORTRAIT = 390 / 844

# name: (source, start s, length s, speed, crop center as a share of the width)
cuts = {
    "washer": ("laundry", 19.6, 2.4, 0.3, 0.5),
    "living-room": ("apartment", 117.8, 3.0, 0.2, 0.55),
}

# name: (source, time s)
stills = {
    "washer": ("laundry", 21.0),
    "window": ("apartment", 36.0),
    "living-room": ("apartment", 30.0),
    "desk": ("apartment", 6.0),
}


def ffmpeg(*args: str):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


def source(name: str):
    path = sources / f"{name}.webm"

    if not path.exists():
        request = urllib.request.Request(footage[name], headers={"User-Agent": "TourLensDemo/1.0"})

        with urllib.request.urlopen(request) as response:
            path.write_bytes(response.read())

    return path


sources.mkdir(parents=True, exist_ok=True)
clips.mkdir(parents=True, exist_ok=True)

for name, (src, start, length, speed, center) in cuts.items():
    crop = f"crop=ih*{PORTRAIT}:ih:(iw-ih*{PORTRAIT})*{center}:0"
    slow = f"setpts=PTS/{speed},minterpolate=fps=30:mi_mode=mci,scale=780:-2"
    graph = f"[0:v]{crop},{slow},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[out]"

    ffmpeg("-ss", str(start), "-t", str(length), "-i", str(source(src)), "-filter_complex", graph, "-map", "[out]",
           "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(clips / f"{name}.mp4"))

for name, (src, time) in stills.items():
    ffmpeg("-ss", str(time), "-i", str(source(src)), "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "3",
           str(rooms / f"{name}.jpg"))
