# LEGACY: produced the word pictures of the picture dictionary. Kept for the prompt and the style.
# It will not run as it is: public/words.json no longer exists. The words now live in
# content-src/dictionary.json and each picture is a file public/pics/<id>.webp (294x180), so
# the input and the output have to be adapted before it is used for a new word.
# Needs GEMINI_API_KEY in the environment.
import json, base64, urllib.request, urllib.error, sys, io, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

# Paths are relative to this repository (the scripts were first run in a sandbox).
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
MEDIA = os.path.join(REPO, "src", "data", ".media")
WORDS_JSON = os.path.join(REPO, "public", "words.json")


API_KEY = os.environ["GEMINI_API_KEY"]
MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

OUT = os.path.join(MEDIA, "images")
os.makedirs(OUT, exist_ok=True)

STYLE = ("Cute kawaii cartoon illustration, soft pastel colors, simple flat design, "
         "rounded shapes, friendly and warm, plain solid pale-cream background, centered subject, "
         "no text or letters, language-learning flashcard art, wide landscape composition")

level = int(sys.argv[1]) if len(sys.argv) > 1 else 1
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 999

SUBJECTS = {}
try:
    if level == 1:
        from l1_subjects import L1_SUBJECTS as SUBJECTS
    elif level == 2:
        from l2_subjects import L2_SUBJECTS as SUBJECTS
    elif level == 3:
        from l3_subjects import L3_SUBJECTS as SUBJECTS
    elif level == 4:
        from l4_subjects import L4_SUBJECTS as SUBJECTS
except ImportError:
    SUBJECTS = {}

with open(WORDS_JSON) as f:
    words = json.load(f)
target = [w for w in words if w["level"] == level]

done = 0
for w in target:
    out_path = os.path.join(OUT, f"word_{w['id']:03d}.png")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        continue
    if done >= limit:
        break
    subj = SUBJECTS.get(w["id"], f"a cute kawaii cartoon illustration representing the concept of {w['ru']!r}")
    prompt = f"{STYLE}. Subject: {subj}."
    body = json.dumps({
        "contents": [{"parts":[{"text": prompt}]}],
        "generationConfig": {"responseModalities":["IMAGE"]}
    }).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type":"application/json", "x-goog-api-key": API_KEY}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            resp = json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"ERR id={w['id']}: {e.code} {e.read()[:200].decode()}", file=sys.stderr)
        sys.exit(1)
    parts = resp.get("candidates",[{}])[0].get("content",{}).get("parts",[])
    img_data = None
    for p in parts:
        if "inlineData" in p:
            img_data = base64.b64decode(p["inlineData"]["data"])
            break
    if not img_data:
        print(f"WARN id={w['id']}: no image returned", file=sys.stderr)
        continue

    img = Image.open(io.BytesIO(img_data)).convert("RGB")
    iw, ih = img.size
    target_ratio = 294 / 180
    if iw / ih > target_ratio:
        new_w = int(ih * target_ratio)
        left = (iw - new_w) // 2
        img = img.crop((left, 0, left + new_w, ih))
    else:
        new_h = int(iw / target_ratio)
        top = (ih - new_h) // 2
        img = img.crop((0, top, iw, top + new_h))
    img = img.resize((294, 180), Image.LANCZOS)
    img.save(out_path, format="PNG", optimize=True)
    done += 1
    print(f"  id={w['id']:>3} {w['ka']:<14} {w['ru']:<22} {os.path.getsize(out_path)}B")

print(f"batch done: {done}")
