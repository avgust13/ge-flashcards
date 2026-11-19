# LEGACY: produced the original word clips in public/words.json.
# NOTE: eleven_multilingual_v2 does not list Georgian among its languages —
# use scripts/content/tts.ts (eleven_v4) for any new audio.
# Needs ELEVENLABS_API_KEY in the environment.
import json, base64, urllib.request, urllib.error, sys, os

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

with open(WORDS_JSON) as f:
    words = json.load(f)
l0 = [w for w in words if w["level"] == 0 and not w.get("audio")]

# Optional CLI args: limit number to process this batch
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 999

done = 0
for w in l0:
    out_path = os.path.join(OUT, f"word_{w['id']:02d}.mp3")
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
    print(f"OK id={w['id']:>2}  {w['ka']:<14}  {len(audio):>6}B")

print(f"\nbatch done: {done} files")
