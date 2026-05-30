Drop any outfit images here (.png, .jpg, .webp).

FitMirror picks them up automatically:
1. Start the backend once (from fitmirror/backend/):
   py -m uvicorn main:app --reload --port 8000
2. Refresh the app in the browser — it scans this folder and builds the outfit list.

File names become labels: "cool_hoodie.png" → "Cool Hoodie".
You can use any filename; no need to edit main.js.
