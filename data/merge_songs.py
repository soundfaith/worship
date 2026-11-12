import json
import pathlib

# Paths (relative to this script's location)
BASE_DIR = pathlib.Path(__file__).parent
SONGS_PATH = BASE_DIR / "songs.json"
TAGGED_PATH = BASE_DIR / "song_tagged.json"
OUTPUT_PATH = BASE_DIR / "songs2.json"

def load_json(path: pathlib.Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def main():
    # Load original songs data
    songs_data = load_json(SONGS_PATH)
    songs_list = songs_data.get("songs", [])

    # Load tagged metadata (list of dicts)
    tagged_list = load_json(TAGGED_PATH)
    # Build lookup by id for fast access
    tagged_by_id = {item["id"]: item for item in tagged_list}

    merged_songs = []
    for song in songs_list:
        song_id = song.get("id")
        # Copy the original song dict to avoid mutating input
        merged = dict(song)
        tagged = tagged_by_id.get(song_id)
        if tagged:
            # Merge the required fields
            for field in ("language", "tempo", "energy", "tags"):
                if field in tagged:
                    merged[field] = tagged[field]
        merged_songs.append(merged)

    # Write the merged output
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump({"songs": merged_songs}, f, ensure_ascii=False, indent=2)
    print(f"✅ Merged {len(merged_songs)} songs into {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
