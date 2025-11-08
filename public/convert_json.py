import json
from datetime import datetime

# Charger le JSON depuis un fichier ou une variable
with open('brackets.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def convert_heure_to_date_time(obj):
    if isinstance(obj, dict):
        if 'heure' in obj:
            # Convertir "08/11 20h11" en "2025-11-08" et "20:11"
            heure_str = obj.pop('heure')
            dt = datetime.strptime(heure_str, "%d/%m %Hh%M")
            obj['date'] = f"2025-{dt.month:02d}-{dt.day:02d}"
            obj['time'] = f"{dt.hour:02d}:{dt.minute:02d}"
        for k in obj:
            convert_heure_to_date_time(obj[k])
    elif isinstance(obj, list):
        for item in obj:
            convert_heure_to_date_time(item)

convert_heure_to_date_time(data)

# Sauvegarder le JSON mis à jour
with open('combats_updated.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
