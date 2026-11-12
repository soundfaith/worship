import json

INPUT_FILE = "songs.json"
OUTPUT_FILE = "song_titles.json"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

songs = data.get("songs", [])

titles = [
    {
        "id": song["id"],
        "title": song["title"]
    }
    for song in songs
]

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(titles, f, indent=2, ensure_ascii=False)

print(f"Extracted {len(titles)} songs to {OUTPUT_FILE}")