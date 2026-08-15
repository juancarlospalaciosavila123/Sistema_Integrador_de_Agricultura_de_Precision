import json
import os
import math
from config import DB_FILE

def cargar_db():
    if not os.path.exists(DB_FILE): return {}
    with open(DB_FILE, 'r') as f: return json.load(f)

def guardar_db(data):
    with open(DB_FILE, 'w') as f: json.dump(data, f, indent=4)

def limpiar_datos_json(data):
    """Elimina NaNs e infinitos que rompen el JSON"""
    if isinstance(data, dict): return {k: limpiar_datos_json(v) for k, v in data.items()}
    elif isinstance(data, list): return [limpiar_datos_json(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data): return None
        return data
    else: return data