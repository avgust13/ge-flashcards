# LEGACY: produced the original word clips in public/words.json.
# NOTE: eleven_multilingual_v2 does not list Georgian among its languages —
# use scripts/content/tts.ts (eleven_v4) for any new audio.
# Needs ELEVENLABS_API_KEY in the environment.
import json, urllib.request, urllib.error, sys, os

# Paths are relative to this repository (the scripts were first run in a sandbox).
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
MEDIA = os.path.join(REPO, "src", "data", ".media")
WORDS_JSON = os.path.join(REPO, "public", "words.json")


API_KEY = os.environ["ELEVENLABS_API_KEY"]
VOICE_ID = "GFIZ2FNmiBBUsDkFmuPr"
MODEL = "eleven_multilingual_v2"
URL = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128"

OUT = os.path.join(MEDIA, "audio")
os.makedirs(OUT, exist_ok=True)

level = int(sys.argv[1]) if len(sys.argv) > 1 else 1
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 999

with open(WORDS_JSON) as f:
    words = json.load(f)
target = [w for w in words if w["level"] == level]

done = 0
for w in target:
    out_path = os.path.join(OUT, f"word_{w['id']:03d}.mp3")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        continue
    if done >= limit:
        break
    body = json.dumps({"text": w["ka"], "model_id": MODEL}).encode()
    req = urllib.request.Request(URL, data=body,
        headers={"xi-api-key": API_KEY, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            audio = r.read()
    except urllib.error.HTTPError as e:
        print(f"ERR id={w['id']}: {e.code} {e.read()[:200].decode()}", file=sys.stderr)
        sys.exit(1)
    with open(out_path, "wb") as f:
        f.write(audio)
    done += 1
    if done % 5 == 0 or done == 1:
        print(f"  id={w['id']:>3} {w['ka']:<14} ({len(audio)}B)")

print(f"batch done: {done} files")
