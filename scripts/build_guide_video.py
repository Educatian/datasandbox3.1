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
        "Welcome to Data Sandbox: statistics you can grab. Fifty simulations, "
        "thirteen real datasets, and a Socratic AI tutor."
    ),
    "portal": (
        "Jump in with the free demo. The portal spans measurement scales to ANOVA, "
        "tracks what you've explored, and suggests a next step. The path stays yours."
    ),
    "predict": (
        "Modules start by asking what YOU think. Lock in a prediction, and your "
        "confidence, before the simulation unlocks. That commitment is where learning happens."
    ),
    "observe": (
        "Then experiment: a hundred random bounces pile into a bell curve. Afterwards the app "
        "explains what you saw, including the misconception your intuition may have used."
    ),
    "missions": (
        "Every simulation has two gears: free sandbox play, or missions with live goal "
        "tracking. Add real data, class comparisons, and a tutor that asks before it answers."
    ),
    "outro": (
        "Everything you do becomes your personal lab notebook. "
        "Data Sandbox: statistics you can grab."
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

    # 1. Synthesize each scene's narration, then schedule clips sequentially:
    #    a clip starts at its scene timestamp OR right after the previous clip
    #    ends (+0.3s breath), whichever is later, so voices never overlap.
    clips: list[tuple[str, Path, float, float]] = []  # (name, path, start, dur)
    cursor = 0.0
    for name, text in NARRATION.items():
        if name not in starts:
            continue
        mp3 = ASSETS / f"narr_{name}.mp3"
        run(["edge-tts", "--voice", VOICE, "--rate", "+8%", "--text", text,
             "--write-media", str(mp3)])
        dur = duration_of(mp3)
        start = max(starts[name], cursor)
        cursor = start + dur + 0.3
        clips.append((name, mp3, start, dur))
        print(f"  {name}: scene {starts[name]:.1f}s -> speaks {start:.1f}-{start + dur:.1f}s")

    audio_end = cursor
    video_dur = duration_of(video)
    # Extend the video by cloning the last frame if narration runs longer
    extend = max(0.0, audio_end - video_dur + 0.2)
    total = max(video_dur, audio_end + 0.2)

    # 2. Delay each clip to its start and mix (audio inputs begin at index 1)
    inputs: list[str] = []
    filters: list[str] = [f"[0:v]tpad=stop_mode=clone:stop_duration={extend:.2f}[vout]"]
    for i, (name, mp3, start, _dur) in enumerate(clips):
        inputs += ["-i", str(mp3)]
        delay_ms = max(0, int(start * 1000))
        filters.append(f"[{i + 1}:a]adelay={delay_ms}|{delay_ms},apad[a{i}]")
    mix_inputs = "".join(f"[a{i}]" for i in range(len(clips)))
    filters.append(f"{mix_inputs}amix=inputs={len(clips)}:normalize=0[aout]")

    # 3. Mux (h264/aac mp4 for universal playback)
    out = OUT / "tour.mp4"
    run(["ffmpeg", "-y", "-i", str(video), *inputs,
         "-filter_complex", ";".join(filters),
         "-map", "[vout]", "-map", "[aout]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-c:a", "aac", "-b:a", "128k",
         "-t", f"{total:.2f}",
         "-movflags", "+faststart",
         str(out)])
    size_kb = out.stat().st_size // 1024
    print(f"Wrote {out} ({size_kb} KB, {total:.1f}s)")


if __name__ == "__main__":
    main()
