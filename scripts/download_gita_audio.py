import argparse
import json
import time
from collections import defaultdict
from pathlib import Path

import requests

BASE_URL = "https://www.gitasupersite.iitk.ac.in/sites/default/files/audio"
DEFAULT_JSON_PATH = Path(__file__).resolve().parents[1] / "data" / "gita.json"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[1] / "Bhagavad_Gita_Audio"


def build_chapter_verse_map(json_path: Path) -> dict[int, list[int]]:
    with json_path.open("r", encoding="utf-8") as f:
        verses = json.load(f)

    chapter_map: dict[int, set[int]] = defaultdict(set)
    for item in verses:
        chapter = int(item["chapter"])
        verse = int(item["verse"])
        chapter_map[chapter].add(verse)

    return {chapter: sorted(verse_numbers) for chapter, verse_numbers in sorted(chapter_map.items())}


def download_gita_audio(
    chapter_verse_map: dict[int, list[int]],
    output_dir: Path,
    pause_seconds: float,
    timeout_seconds: int,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0
    total = sum(len(verses) for verses in chapter_verse_map.values())

    with requests.Session() as session:
        for chapter, verse_numbers in chapter_verse_map.items():
            print(f"--- Starting Chapter {chapter} ({len(verse_numbers)} verses) ---")
            chapter_dir = output_dir / f"Chapter_{chapter}"
            chapter_dir.mkdir(parents=True, exist_ok=True)

            for verse in verse_numbers:
                file_name = f"{chapter}-{verse}.MP3"
                url = f"{BASE_URL}/CHAP{chapter}/{file_name}"
                save_path = chapter_dir / file_name

                if save_path.exists():
                    skipped += 1
                    continue

                try:
                    response = session.get(url, stream=True, timeout=timeout_seconds)
                    if response.status_code == 200:
                        with save_path.open("wb") as f:
                            for chunk in response.iter_content(chunk_size=1024):
                                if chunk:
                                    f.write(chunk)
                        downloaded += 1
                        print(f"Downloaded: {file_name}")
                    else:
                        failed += 1
                        print(f"Failed (Status {response.status_code}): {file_name}")
                except Exception as exc:
                    failed += 1
                    print(f"Error downloading {file_name}: {exc}")

                time.sleep(pause_seconds)

    print("--- Download run complete! ---")
    print(f"Expected from JSON: {total}")
    print(f"Downloaded now: {downloaded}")
    print(f"Skipped existing: {skipped}")
    print(f"Failed: {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Bhagavad Gita verse audio files.")
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON_PATH,
        help=f"Path to verse metadata JSON (default: {DEFAULT_JSON_PATH})",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=0.5,
        help="Pause between requests in seconds (default: 0.5)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)",
    )
    args = parser.parse_args()

    chapter_verse_map = build_chapter_verse_map(args.json)
    total = sum(len(verses) for verses in chapter_verse_map.values())
    print(f"Loaded metadata from: {args.json}")
    print(f"Found {len(chapter_verse_map)} chapters and {total} verses")
    print("Chapter counts from JSON:")
    for chapter, verses in chapter_verse_map.items():
        print(f"  Chapter {chapter}: {len(verses)}")

    download_gita_audio(chapter_verse_map, args.out, args.pause, args.timeout)


if __name__ == "__main__":
    main()
