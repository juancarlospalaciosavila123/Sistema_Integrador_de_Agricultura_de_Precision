import ee
from config import CLOUD_COVER_MAX, MIN_NDVI, MAX_NDVI, NDVI_PALETTE, GEE_PROJECT

def init_gee():
    try:
        ee.Initialize(project=GEE_PROJECT)
        print("✅ GEE Conectado")
    except Exception as e:
        print(f"❌ Error GEE: {e}")

def mask_clouds(image):
    # --- BLINDAJE: Aseguramos que sea una Imagen ---
    image = ee.Image(image) 
    
    qa = image.select('QA_PIXEL')
    # Bits 3 y 4 son nubes y sombra de nubes
    mask = qa.bitwiseAnd(1 << 3).eq(0).And(qa.bitwiseAnd(1 << 4).eq(0))
    
    return image.updateMask(mask).multiply(0.0000275).add(-0.2).copyProperties(image, ['system:time_start'])

def add_ndvi(image):
    # --- BLINDAJE: Aseguramos que sea una Imagen ---
    image = ee.Image(image)
    
    # Ahora sí, normalizedDifference funcionará siempre
    ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
    return image.addBands(ndvi).copyProperties(image, ['system:time_start'])

def get_collection(bbox, start=None, end=None):
    aoi = ee.Geometry.Polygon([[
        [bbox[0], bbox[1]], [bbox[0], bbox[3]], 
        [bbox[2], bbox[3]], [bbox[2], bbox[1]]
    ]])
    
    col = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2")) \
            .filterBounds(aoi).filterMetadata('CLOUD_COVER', 'less_than', CLOUD_COVER_MAX) \
            .map(mask_clouds).map(add_ndvi).select('NDVI')
            
    if start and end:
        col = col.filterDate(start, end)
        
    return col, aoi

def get_tile_url(image_obj, aoi):
    # También blindamos aquí por seguridad
    image_obj = ee.Image(image_obj)
    vis = {'min': MIN_NDVI, 'max': MAX_NDVI, 'palette': NDVI_PALETTE}
    return image_obj.clip(aoi).getMapId(vis)['tile_fetcher'].url_format

def get_monthly_data(collection, aoi, start_str, end_str):
    """Calcula el promedio NDVI mes a mes"""
    start = ee.Date(start_str)
    end = ee.Date(end_str)
    n_months = end.difference(start, 'month').round()
    
    offsets = ee.List.sequence(0, n_months.subtract(1))
    
    def procesar_mes(offset):
        offset = ee.Number(offset)
        m_start = start.advance(offset, 'month')
        m_end = m_start.advance(1, 'month')
        m_col = collection.filterDate(m_start, m_end)
        
        val = ee.Algorithms.If(
            m_col.size().gt(0),
            m_col.median().reduceRegion(
                reducer=ee.Reducer.mean(), 
                geometry=aoi, 
                scale=100, 
                maxPixels=1e9
            ).get('NDVI'),
            None
        )
        return ee.Feature(None, {
            'label': m_start.format('YYYY-MM'), 
            'mean_ndvi': val, 
            'image_count': m_col.size()
        })

    try:
        features = ee.FeatureCollection(offsets.map(procesar_mes)).getInfo()
        return [f['properties'] for f in features['features']]
    except Exception as e:
        print(f"Error mensual: {e}")
        return []