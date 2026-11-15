# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["kokoro>=0.9.4", "soundfile>=0.12", "numpy"]
# ///
"""Generate a voice-over for a video from its SRT file with Kokoro-82M (open-source TTS).

Each subtitle cue is synthesised separately and placed at its start time, so the narration
stays in sync with the existing captions. If a phrase runs longer than its slot, it is sped
up (at most MAX_SPEEDUP) instead of overlapping the next cue.

Model: hexgrad/Kokoro-82M, Apache-2.0 licence (weights downloaded from Hugging Face on first run).

Usage:
    uv run scripts/narrate_srt.py VIDEO.mp4 VIDEO.en.srt OUT.mp4 [--voice af_heart] [--keep-wav]
"""

from __future__ import annotations

import argparse
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import numpy.typing as npt
import soundfile as sf

SAMPLE_RATE_HZ = 24_000  # Kokoro output rate
MAX_SPEEDUP = 1.15  # largest speech-rate increase allowed to fit a cue slot
TAIL_PAD_S = 0.6  # silence after the last cue
SILENCE_THRESHOLD = (
    0.01  # linear amplitude (~ -40 dBFS) treated as silence when trimming
)
SILENCE_MARGIN_S = (
    0.05  # keep this much around the speech so onsets/decays are not clipped
)

_TIME = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)")


@dataclass(frozen=True)
class Cue:
    start_s: float
    end_s: float
    text: str


def _to_seconds(stamp: str) -> float:
    m = _TIME.fullmatch(stamp.strip())
    if m is None:
        raise ValueError(f"Bad SRT timestamp: {stamp!r}")
    h, mi, s, ms = (int(g) for g in m.groups())
    return h * 3600 + mi * 60 + s + ms / 1000


def parse_srt(path: Path) -> list[Cue]:
    cues: list[Cue] = []
    for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8").strip()):
        lines = [ln for ln in block.splitlines() if ln.strip()]
        timing = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if timing is None:
            continue
        start, end = lines[timing].split("-->")
        text = " ".join(lines[timing + 1 :]).strip()
        if text:
            cues.append(Cue(_to_seconds(start), _to_seconds(end), text))
    return cues


def _trim_silence(audio: npt.NDArray[np.float32]) -> npt.NDArray[np.float32]:
    """Drop leading/trailing near-silence (Kokoro pads each phrase), keeping a short fade margin."""
    loud = np.flatnonzero(np.abs(audio) > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    margin = int(SILENCE_MARGIN_S * SAMPLE_RATE_HZ)
    return audio[max(loud[0] - margin, 0) : loud[-1] + margin]


def synthesize(cues: list[Cue], voice: str, total_s: float) -> npt.NDArray[np.float32]:
    from kokoro import KPipeline  # heavy import, keep local

    lang = voice[0]  # Kokoro voice ids start with the language code ('a' = US English)
    pipeline = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    track = np.zeros(int((total_s + TAIL_PAD_S) * SAMPLE_RATE_HZ), dtype=np.float32)

    for i, cue in enumerate(cues):
        next_start = cues[i + 1].start_s if i + 1 < len(cues) else total_s
        slot_s = max(next_start - cue.start_s, 0.1)

        def render(speed: float, text: str = cue.text) -> npt.NDArray[np.float32]:
            parts = [
                np.asarray(audio, dtype=np.float32)
                for _, _, audio in pipeline(text, voice=voice, speed=speed)
            ]
            return (
                _trim_silence(np.concatenate(parts))
                if parts
                else np.zeros(0, dtype=np.float32)
            )

        speed = 1.0
        audio = render(speed)
        dur_s = len(audio) / SAMPLE_RATE_HZ
        # Kokoro's speed is not exactly linear in duration: refine a few times, within the cap.
        for _ in range(3):
            if dur_s <= slot_s or speed >= MAX_SPEEDUP:
                break
            speed = min(speed * dur_s / slot_s * 1.02, MAX_SPEEDUP)
            audio = render(speed)
            dur_s = len(audio) / SAMPLE_RATE_HZ
        status = "OVERRUN" if dur_s > slot_s + 0.05 else "ok"
        print(
            f"[{cue.start_s:6.2f}s] {dur_s:4.2f}s / slot {slot_s:4.2f}s {status}  {cue.text}"
        )

        start = int(cue.start_s * SAMPLE_RATE_HZ)
        end = min(start + len(audio), len(track))
        track[start:end] += audio[: end - start]

    peak = float(np.max(np.abs(track))) or 1.0
    return track * (0.89 / peak)  # normalise to about -1 dBFS


def video_duration_s(video: Path) -> float:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(video),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("video", type=Path)
    ap.add_argument("srt", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument(
        "--voice",
        default="af_heart",
        help="Kokoro voice id, e.g. af_heart, am_michael, bf_emma",
    )
    ap.add_argument(
        "--keep-wav", action="store_true", help="also write the narration as OUT.wav"
    )
    args = ap.parse_args()

    total_s = video_duration_s(args.video)
    track = synthesize(parse_srt(args.srt), args.voice, total_s)
    wav = args.out.with_suffix(".wav")
    sf.write(wav, track, SAMPLE_RATE_HZ)

    # Replace the original audio with the narration; video stream is copied untouched.
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(args.video),
            "-i",
            str(wav),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-t",
            f"{total_s:.3f}",
            str(args.out),
        ],
        check=True,
    )
    if not args.keep_wav:
        wav.unlink()
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
