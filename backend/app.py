from flask import Flask, request, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import ee
import random
import time

# Importaciones de tus módulos locales
from config import NDVI_PALETTE, MIN_NDVI, MAX_NDVI
from gee_service import init_gee, get_collection, get_tile_url, mask_clouds, add_ndvi, get_monthly_data
from email_service import generar_html, enviar_correo
from database import cargar_db, guardar_db, limpiar_datos_json

app = Flask(__name__)
CORS(app)

# Inicializar Google Earth Engine
init_gee()

# --- VIGILANTE (VERSIÓN FINAL BLINDADA) ---
def verificar_cambios():
    print("🔎 [VIGILANTE] Revisando satélites...")
    db = cargar_db()
    updates = False
    
    for email, data in db.items():
        coords = data['coords']
        last_count = data.get('last_image_count', 0)
        last_ndvi = data.get('last_ndvi', 0.0)
        
        point = ee.Geometry.Point(coords)
        aoi = point.buffer(100).bounds()
        
        # 1. Buscamos imágenes recientes
        raw_col = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")) \
                    .filterBounds(aoi).filterMetadata('CLOUD_COVER', 'less_than', 100) \
                    .sort('system:time_start', False)
        
        curr_count = raw_col.size().getInfo()
        
        # 2. Si el contador subió, procesamos
        if curr_count > last_count:
            print(f"🚀 Nueva imagen detectada para {email} (Total: {curr_count})")
            
            # Forzamos tipo Imagen al inicio
            img = ee.Image(raw_col.first()) 
            
            try:
                # Procesamos: Nubes -> NDVI
                img_sin_nubes = mask_clouds(img)
                
                # --- CORRECCIÓN FINAL AQUÍ ---
                # Envolvemos el resultado en ee.Image() para que NO falle el reduceRegion
                img_con_ndvi = ee.Image(add_ndvi(img_sin_nubes))
                
                # Ahora reduceRegion funcionará porque Python sabe que es una imagen
                val = img_con_ndvi.reduceRegion(
                    reducer=ee.Reducer.mean(), 
                    geometry=aoi, 
                    scale=30,
                    maxPixels=1e9
                ).get('NDVI').getInfo()
                
                if val is not None:
                    diff = val - last_ndvi
                    
                    # Semáforo de alerta
                    tipo = "ESTABILIDAD"
                    if diff <= -0.02: tipo = "DEFORESTACION"
                    elif diff >= 0.02: tipo = "RECUPERACION"
                    
                    print(f"   📧 Generando reporte {tipo}...")
                    asunto, body = generar_html(tipo, last_ndvi, val, coords[1], coords[0])
                    enviar_correo(email, asunto, body)
                    
                    data.update({'last_image_count': curr_count, 'last_ndvi': val})
                    updates = True
                    print(f"   ✅ Éxito. Nuevo NDVI: {val:.4f}")
                else:
                    print("   ☁️ La imagen es válida pero tiene nubes en el punto exacto.")
                    data['last_image_count'] = curr_count
                    updates = True
                    
            except Exception as e:
                print(f"   ❌ Error interno GEE: {e}")
                # IMPORTANTE: No actualizamos el contador si falló por error de código, 
                # para que lo intente de nuevo en la próxima corrección.
                # data['last_image_count'] = curr_count (Comentamos esto para que reintente)
                # updates = True

    if updates: guardar_db(db)
# ---------------------------------------------------------
# RUTAS DEL SERVIDOR
# ---------------------------------------------------------

@app.route('/procesar-ndvi', methods=['POST'])
def procesar():
    d = request.json
    col, aoi = get_collection(d['bbox'], d['startDate'], d['endDate'])
    
    count = col.size().getInfo()
    url = None
    overall = None
    monthly_list = []

    if count > 0:
        mean_img = col.mean()
        overall = mean_img.reduceRegion(ee.Reducer.mean(), aoi, 100).get('NDVI').getInfo()
        url = get_tile_url(mean_img, aoi)
        monthly_list = get_monthly_data(col, aoi, d['startDate'], d['endDate'])
        
    return jsonify(limpiar_datos_json({
        "status": "success", 
        "tileUrl": url, 
        "overall_mean_ndvi": overall,
        "monthly_data": monthly_list,
        "imageCount": count
    }))

@app.route('/get-quarterly-image', methods=['POST'])
def get_capa_periodica():
    d = request.json
    label = d['q_label'] 
    start_date = f"{label}-01"
    end_date = ee.Date(start_date).advance(1, 'month').format('YYYY-MM-dd').getInfo()
    col, aoi = get_collection(d['bbox'], start_date, end_date)
    
    if col.size().getInfo() > 0:
        img = col.mean()
        url = get_tile_url(img, aoi)
        return jsonify({"status": "success", "tileUrl": url})
    else:
        return jsonify({"status": "error", "message": "Sin imágenes"})


@app.route('/guardar-monitoreo', methods=['POST'])
def guardar():
    d = request.json
    db = cargar_db()
    # Guardamos contadores en 0 para forzar revisión inmediata
    db[d['email']] = {"coords": d['center'], "last_image_count": 0, "last_ndvi": 0.0}
    guardar_db(db)
    
    # Ejecutamos el vigilante en segundo plano inmediatamente
    scheduler.add_job(verificar_cambios)
    
    return jsonify({"status": "success", "message": "Vigilancia Activada"})

@app.route('/test-simulacro', methods=['POST'])
def simulacro():
    email = request.json.get('email')
    caso = random.choice(["DEFORESTACION", "RECUPERACION", "ESTABILIDAD"])
    if caso == "DEFORESTACION": v1, v2 = 0.65, 0.21
    elif caso == "RECUPERACION": v1, v2 = 0.20, 0.45
    else: v1, v2 = 0.40, 0.41
    asunto, body = generar_html(caso, v1, v2, 19.787, -98.554)
    enviar_correo(email, f"[TEST] {asunto}", body)
    return jsonify({"status": "success", "message": f"Simulacro {caso} enviado"})

if __name__ == '__main__':
    scheduler = BackgroundScheduler()
    # Configurado para revisar todos los días a las 9:00 AM
    scheduler.add_job(verificar_cambios, 'cron', hour=9)
    scheduler.start()
    app.run(debug=True, port=5000)