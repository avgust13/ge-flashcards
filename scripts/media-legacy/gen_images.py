# LEGACY: produced the word pictures of the picture dictionary. Kept for the prompt and the style.
# It will not run as it is: public/words.json no longer exists. The words now live in
# content-src/dictionary.json and each picture is a file public/pics/<id>.webp (294x180), so
# the input and the output have to be adapted before it is used for a new word.
# Needs GEMINI_API_KEY in the environment.
import json, base64, urllib.request, urllib.error, sys, io, os
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

# Per-word subject for L0 words 11-82
SUBJECTS = {
    11: "a friendly waving character giving a casual informal hi greeting",
    12: "a polite bowing cartoon character with one hand on heart, saying please",
    13: "a small cartoon character with apologetic face and slight bow, saying sorry",
    14: "a polite cartoon character with a raised index finger to get attention",
    15: "a small character nodding head with closed eyes in formal agreement",
    16: "a friendly hand reaching out to help another, helping gesture",
    17: "a clean name tag sticker that says 'NAME' with a smiling face",
    18: "a friendly cartoon police officer with badge and cap",
    19: "a small cartoon character pointing at itself with both thumbs, saying 'me'",
    20: "a cartoon character pointing forward at the viewer with friendly smile, saying 'you'",
    21: "a polite cartoon character gesturing toward two figures with an open hand, formal you",
    22: "a cartoon character pointing sideways at a third figure, saying he or she",
    23: "two cartoon characters together with arms around each other, saying 'we'",
    24: "a small group of three cartoon characters together saying 'they'",
    25: "a finger pointing at something nearby, indicating 'this'",
    26: "a finger pointing at something slightly farther away, indicating 'that'",
    27: "the digit 0 in cute bubbly cartoon style",
    28: "the digit 1 in cute bubbly cartoon style",
    29: "the digit 2 in cute bubbly cartoon style",
    30: "the digit 3 in cute bubbly cartoon style",
    31: "the digit 4 in cute bubbly cartoon style",
    32: "the digit 5 in cute bubbly cartoon style",
    33: "the digit 6 in cute bubbly cartoon style",
    34: "the digit 7 in cute bubbly cartoon style",
    35: "the digit 8 in cute bubbly cartoon style",
    36: "the digit 9 in cute bubbly cartoon style",
    37: "the number 10 in cute bubbly cartoon style",
    38: "a cute question mark with a face plus a silhouette of a person, meaning who",
    39: "a cute question mark with a face plus a question bubble, meaning what",
    40: "a cute map pin with a question mark above it, meaning where",
    41: "a clock with a question mark above it, meaning when",
    42: "a cute lightbulb with a question mark and curious face, meaning why",
    43: "a swirly arrow with a question mark, meaning how",
    44: "a stack of coins with a question mark, meaning how many",
    45: "a cute character with arms wide pointing at itself, with a sparkle, saying I am",
    46: "a happy character holding a box of items, meaning I have",
    47: "a character with a happy face and a thought-bubble showing a heart, meaning I want",
    48: "a smart character with a lightbulb above its head, meaning I know",
    49: "a character with both hands around big sparkling eyes, looking, meaning I see",
    50: "a character with a big open mouth and speech bubble, talking, meaning I speak",
    51: "a fork with a piece of food being lifted toward an open mouth, eating",
    52: "a glass of water being lifted toward a smiling mouth, drinking",
    53: "a character walking forward with one foot raised, going somewhere",
    54: "a character with a suitcase arriving and waving, coming",
    55: "a small character watering a plant in a sunny home, meaning living",
    56: "a character with a lightbulb turning on above its head, meaning understanding",
    57: "a steaming bowl of food on a plate with a fork, meaning food",
    58: "a steaming cup of black tea with a tea bag tag hanging out",
    59: "a steaming cup of dark coffee with foam swirl on top",
    60: "a smiling cute baby or toddler, meaning child",
    61: "a smiling cartoon mother hugging her child, meaning mom",
    62: "a smiling cartoon father with a hat, meaning dad",
    63: "a generic friendly cartoon person standing, meaning person",
    64: "a calendar showing today's date highlighted with a star",
    65: "a calendar page showing tomorrow with an arrow forward",
    66: "a calendar page showing yesterday with an arrow back",
    67: "a clock pointing to the exact present moment with a 'now' arrow",
    68: "a bright sun in a blue sky, meaning day",
    69: "a moon and stars in a dark sky, meaning night",
    70: "an hourglass with sand falling, meaning time",
    71: "a downward arrow pointing right here at a spot, meaning here",
    72: "an arrow pointing into the distance, meaning there",
    73: "a big arrow pointing to the right",
    74: "a big arrow pointing to the left",
    75: "a big arrow pointing forward/up",
    76: "a big arrow pointing backward/down",
    77: "a cute smiling green thumbs up with a happy face, meaning good",
    78: "a cute frowning red thumbs down with a sad face, meaning bad",
    79: "a small character looking up at a huge elephant, contrasting big",
    80: "a tiny mouse standing next to a regular shoe, showing small",
    81: "a friendly cartoon doctor in white coat with a stethoscope",
    82: "a fan of paper money bills and some gold coins, meaning money",
}

# Optional CLI arg: max items this batch
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 999

with open(WORDS_JSON) as f:
    words = json.load(f)
l0 = [w for w in words if w["level"] == 0 and not w.get("audio") is None and w["id"] >= 11]
# actually, just take L0 with id >= 11
l0 = [w for w in words if w["level"] == 0 and w["id"] >= 11]

done = 0
for w in l0:
    out_path = os.path.join(OUT, f"word_{w['id']:02d}.png")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        continue
    if done >= limit:
        break
    subj = SUBJECTS.get(w["id"], f"a cute cartoon illustration representing {w['ru']}")
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
        print(f"ERR id={w['id']}: no image in response", file=sys.stderr)
        sys.exit(1)

    img = Image.open(io.BytesIO(img_data)).convert("RGB")
    iw, ih = img.size
    target_ratio = 294 / 180
    src_ratio = iw / ih
    if src_ratio > target_ratio:
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
    print(f"OK id={w['id']:>2} {w['ka']:<14} {w['ru']:<22} {os.path.getsize(out_path):>5}B")

print(f"\nbatch done: {done} images")
