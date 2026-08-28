FROM_FILE = "scripts/content_script.js"
TO_FILES = ["popup/clickeffects.js", "hello/clickeffects-full.js"]
CLICKEFFECT_SPLITTER = "// ---------------- Spawning ClickEffects ----------------"

with open(FROM_FILE, "r", encoding="utf-8") as file:
    content_script = file.read()

clickeffect_part = content_script.split(CLICKEFFECT_SPLITTER, 1)[0].strip()

for filepath in TO_FILES:
    with open(filepath, "w", encoding="utf-8") as file:
        if "full" in filepath:
            file.write(content_script)
            print(f"synced full {FROM_FILE} to {filepath}")
        else:
            file.write(clickeffect_part)
            print(f"synced {FROM_FILE} to {filepath}")