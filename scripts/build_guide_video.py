"""Builds the narrated guide video.

Pipeline: record_guide.mjs produces tour_raw.webm + scene_times.json.
This script synthesizes one narration clip per scene (edge-tts), delays each
clip to its scene timestamp, mixes them into a single track, and muxes it
onto the video as public/guide/tour.mp4.

    node scripts/record_guide.mjs
    py scripts/build_guide_video.py
"""
import json
import subprocess
import sys
from pathlib import Path

ASSETS = Path(__file__).parent / "guide_assets"
OUT = Path(__file__).parent.parent / "public" / "guide"
OUT.mkdir(parents=True, exist_ok=True)

VOICE = "en-US-AndrewNeural"

NARRATION = {
    "landing": (
        "Welcome to Data Sandbox, an interactive statistics playground where you don't just "
        "read about statistics, you grab it. Fifty hands-on simulations, thirteen real datasets, "
        "and a Socratic AI tutor called Doctor Gem."
    ),
    "portal": (
        "Jump straight in with the free demo. The portal organizes everything from measurement "
        "scales to ANOVA, marks what you've explored, and suggests a next step, while leaving "
        "the path entirely up to you."
    ),
    "predict": (
        "Most modules begin by asking what YOU think will happen. You lock in a prediction, and "
        "how confident you are, before the simulation unlocks. That commitment is where the "
        "learning happens."
    ),
    "observe": (
        "Now experiment. Watch a hundred random bounces pile up into a bell curve. Then ask the "
        "app to explain what you saw, including the documented misconception your intuition may "
        "have been using."
    ),
    "missions": (
        "Every simulation has two gears. Free sandbox play, or missions: concrete challenges "
        "with live goal tracking. Add real datasets, anonymous class comparisons, and a tutor "
        "that asks before it answers."
    ),
    "outro": (
        "Everything you do, every prediction, mission, and experiment, is collected into your "
        "personal lab notebook. Data Sandbox. Statistics you can grab."
    ),
}


def run(cmd: list[str]):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout)
        print(r.stderr)
        sys.exit(f"FAILED: {' '.join(cmd[:3])}...")
    return r


def duration_of(path: Path) -> float:
    r = run(["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)])
    return float(r.stdout.strip())


def main():
    scenes = json.loads((ASSETS / "scene_times.json").read_text())
    video = ASSETS / "tour_raw.webm"
    if not video.exists():
        sys.exit("tour_raw.webm not found - run record_guide.mjs first")

    starts = {s["name"]: s["ms"] / 1000.0 for s in scenes}

    # 1. Synthesize each scene's narration
    clips: list[tuple[str, Path, float]] = []
    for name, text in NARRATION.items():
        if name not in starts:
            continue
        mp3 = ASSETS / f"narr_{name}.mp3"
        run(["edge-tts", "--voice", VOICE, "--rate", "+4%", "--text", text,
             "--write-media", str(mp3)])
        clips.append((name, mp3, starts[name]))
        print(f"  {name}: starts {starts[name]:.1f}s, length {duration_of(mp3):.1f}s")

    # 2. Delay each clip to its scene start and mix
    inputs: list[str] = []
    filters: list[str] = []
    for i, (name, mp3, start) in enumerate(clips):
        inputs += ["-i", str(mp3)]
        delay_ms = max(0, int(start * 1000))
        filters.append(f"[{i}:a]adelay={delay_ms}|{delay_ms},apad[a{i}]")
    mix_inputs = "".join(f"[a{i}]" for i in range(len(clips)))
    filters.append(f"{mix_inputs}amix=inputs={len(clips)}:normalize=0[aout]")

    video_dur = duration_of(video)

    # 3. Mux onto the video (h264/aac mp4 for universal playback)
    out = OUT / "tour.mp4"
    run(["ffmpeg", "-y", "-i", str(video), *inputs,
         "-filter_complex", ";".join(filters),
         "-map", "0:v", "-map", "[aout]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-c:a", "aac", "-b:a", "128k",
         "-t", f"{video_dur:.2f}",
         "-movflags", "+faststart",
         str(out)])
    size_kb = out.stat().st_size // 1024
    print(f"Wrote {out} ({size_kb} KB, {video_dur:.1f}s)")


if __name__ == "__main__":
    main()
