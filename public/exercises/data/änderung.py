import json

with open("exercises.json", "r", encoding="utf-8") as f:
    data = json.load(f)

for exercise in data:
    if "instructions" in exercise:
        exercise["instructions"] = exercise["instructions"].get("en", "")

    if "instruction_steps" in exercise:
        exercise["instruction_steps"] = exercise["instruction_steps"].get("en", [])

with open("exercises_clean.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print("Fertig!")