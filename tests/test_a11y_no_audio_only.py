"""Deaf / hard-of-hearing guard: no audio-only information anywhere in AETHRA (WCAG 1.2.1, 1.2.2).

Run: python tests/test_a11y_no_audio_only.py      (plain script; also pytest-compatible)

Scans apps/web source and media for anything that produces sound and fails unless it has a text path:
  * Speech synthesis may only live in apps/web/lib/a11y/speak.ts, which must emit the caption event
    BEFORE talking, and <CaptionBar/> must subscribe to it and be mounted by AccessibilityProvider.
  * <audio>/<video> elements need a <track kind="captions|subtitles|descriptions"> in the same file.
  * Raw sound APIs (new Audio, AudioContext, .play() on media) are not allowed without such a path.
  * Media files under apps/web/public and the release videos in docs/release need a sibling .vtt
    (and, for release videos, a .transcript.md).
The scanner is self-tested against small bad fixtures so a silent "pass" can't hide a broken regex.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps" / "web"
SPEAK = WEB / "lib" / "a11y" / "speak.ts"
CAPTIONS = WEB / "components" / "a11y" / "CaptionBar.tsx"
PROVIDER = WEB / "lib" / "a11y" / "accessibility.tsx"
RELEASE = ROOT / "docs" / "release"

# e2e/ is test code (it stubs speechSynthesis on purpose); public/ is media-checked separately.
SKIP_DIRS = {"node_modules", ".next", "e2e-results", "out", "coverage", "public", "e2e"}
CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
MEDIA_EXT = {".mp3", ".wav", ".ogg", ".oga", ".m4a", ".aac", ".flac", ".mp4", ".webm", ".mov", ".ogv"}

SPEECH = re.compile(r"\bspeechSynthesis\b|\bSpeechSynthesisUtterance\b")
RAW_AUDIO = re.compile(r"\bnew\s+Audio\s*\(|\b(?:webkit)?AudioContext\b|\bOfflineAudioContext\b")
MEDIA_TAG = re.compile(r"<(audio|video)\b", re.I)
TRACK = re.compile(r"<track\b[^>]*kind=[\"'](captions|subtitles|descriptions)[\"']", re.I)
MEDIA_IMPORT = re.compile(r"""["'][^"']+\.(mp3|wav|ogg|m4a|aac|flac)["']""", re.I)


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|[^:\"'])//[^\n]*", r"\1", text)


def scan_source(rel: str, text: str) -> list[str]:
    """Problems in one source file (rel = path relative to apps/web, '/' separators)."""
    code = strip_comments(text)
    problems: list[str] = []
    if SPEECH.search(code) and rel != "lib/a11y/speak.ts":
        problems.append(f"{rel}: speech synthesis outside lib/a11y/speak.ts (use speak() so it is captioned)")
    if RAW_AUDIO.search(code):
        problems.append(f"{rel}: raw audio API without a caption path (route sound cues through notify()/speak())")
    if MEDIA_TAG.search(code) and not TRACK.search(code):
        problems.append(f"{rel}: <audio>/<video> without <track kind=captions|subtitles|descriptions>")
    if MEDIA_IMPORT.search(code):
        problems.append(f"{rel}: references an audio file; add captions/transcript and a visual equivalent")
    return problems


def source_files() -> list[Path]:
    out: list[Path] = []
    for p in WEB.rglob("*"):
        if p.suffix in CODE_EXT and p.is_file() and not (set(p.relative_to(WEB).parts) & SKIP_DIRS):
            out.append(p)
    return out


def check_speak_contract(speak: str, captions: str, provider: str) -> list[str]:
    problems: list[str] = []
    s = strip_comments(speak)
    for name in ("export function speak", "export function stopSpeaking", "export function isSpeaking", "export function onSpeech"):
        if name not in s:
            problems.append(f"speak.ts: missing `{name}`")
    start = s.find('state: "start"')
    talk = s.find(".speak(")
    if start == -1:
        problems.append('speak.ts: never emits {state: "start"} (captions would not appear)')
    elif talk != -1 and start > talk:
        problems.append("speak.ts: audio starts before the caption event is emitted")
    if 'state: "end"' not in s:
        problems.append('speak.ts: never emits {state: "end"}')
    if "onSpeech(" not in strip_comments(captions):
        problems.append("CaptionBar.tsx: does not subscribe to onSpeech()")
    if 'aria-live="off"' not in captions:
        problems.append('CaptionBar.tsx: captions must be aria-live="off" (avoid double reading)')
    p = strip_comments(provider)
    if "<CaptionBar" not in p or "components/a11y/CaptionBar" not in p:
        problems.append("accessibility.tsx: <CaptionBar/> is not mounted by AccessibilityProvider")
    if not re.search(r"if\s*\(\s*deafRef\.current\s*\)\s*pushToast\(", p):
        problems.append("accessibility.tsx: announce() is not echoed visually in deaf mode")
    return problems


def check_media_files() -> list[str]:
    problems: list[str] = []
    public = WEB / "public"
    for p in public.rglob("*") if public.exists() else []:
        if p.suffix.lower() in MEDIA_EXT and not list(p.parent.glob(p.stem + "*.vtt")):
            problems.append(f"{p.relative_to(ROOT)}: media file without a .vtt caption file")
    for p in RELEASE.rglob("*") if RELEASE.exists() else []:
        if p.suffix.lower() in MEDIA_EXT:
            if not list(p.parent.glob(p.stem + "*.vtt")):
                problems.append(f"{p.relative_to(ROOT)}: release video without a .vtt file")
            if not (p.parent / f"{p.stem}.transcript.md").exists():
                problems.append(f"{p.relative_to(ROOT)}: release video without {p.stem}.transcript.md")
    for vtt in RELEASE.rglob("*.vtt") if RELEASE.exists() else []:
        body = vtt.read_text(encoding="utf-8")
        if not body.startswith("WEBVTT") or not re.search(r"\d\d:\d\d:\d\d\.\d{3} --> \d\d:\d\d:\d\d\.\d{3}", body):
            problems.append(f"{vtt.relative_to(ROOT)}: not a valid WebVTT file")
    return problems


# --------------------------------------------------------------------------------------------- tests


def test_scanner_catches_bad_fixtures():
    """Self-test: each bad pattern must be reported; the comment-only one must not."""
    bad = {
        "components/x/Beep.tsx": "const a = new Audio('/beep.mp3'); a.play();",
        "components/x/Talk.tsx": "window.speechSynthesis.speak(new SpeechSynthesisUtterance('hi'));",
        "components/x/Clip.tsx": "return <video src='/a.webm' controls />;",
        "components/x/Ctx.ts": "const ctx = new AudioContext();",
    }
    for rel, text in bad.items():
        assert scan_source(rel, text), f"scanner missed {rel}"
    ok = "return <video src='/a.webm'><track kind=\"captions\" src='/a.vtt' /></video>;"
    assert not scan_source("components/x/Ok.tsx", ok)
    assert not scan_source("components/x/C.tsx", "// new Audio('x.mp3') in a comment is fine")
    assert check_speak_contract("", "", ""), "contract check accepted empty files"


def test_no_audio_without_text_equivalent():
    problems = [p for f in source_files() for p in scan_source(f.relative_to(WEB).as_posix(), f.read_text(encoding="utf-8", errors="replace"))]
    assert not problems, "audio-only code found:\n  " + "\n  ".join(problems)


def test_speak_always_feeds_captions():
    problems = check_speak_contract(
        SPEAK.read_text(encoding="utf-8"), CAPTIONS.read_text(encoding="utf-8"), PROVIDER.read_text(encoding="utf-8")
    )
    assert not problems, "\n  ".join(problems)


def test_media_files_have_captions_and_transcripts():
    problems = check_media_files()
    assert not problems, "\n  ".join(problems)


def main() -> int:
    tests = [v for k, v in globals().items() if k.startswith("test_") and callable(v)]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    scanned = len(source_files())
    print(f"\n{len(tests) - failed}/{len(tests)} passed · {scanned} source files scanned under apps/web")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
