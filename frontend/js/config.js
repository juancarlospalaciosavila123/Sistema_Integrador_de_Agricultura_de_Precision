/**
 * Configuración global.
 * Define la URL del backend Python.
 */
export const CONFIG = {
    // Si tu backend corre en otro puerto, cámbialo aquí.
    API_URL: 'http://127.0.0.1:5000', 
    
    ENDPOINTS: {
        PROCESAR: '/procesar-ndvi',
        CAPA_PERIODICA: '/get-quarterly-image',
        GUARDAR_MONITOREO: '/guardar-monitoreo',
        SIMULACRO: '/test-simulacro'
    },
    
    MAP: {
        CENTER: [19.787, -98.554], // Tepeapulco
        ZOOM: 13,
        // Capa satelital de ESRI (Buena calidad)
        TILE_LAYER: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    }
};