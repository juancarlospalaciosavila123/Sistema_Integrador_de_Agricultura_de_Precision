import { CONFIG } from './config.js';

/**
 * Gestor del Mapa Leaflet
 */
let map = null;
let marker = null;
let square = null;
let currentLayer = null;

export const MapManager = {
    init(elemId) {
        map = L.map(elemId).setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
        
        L.tileLayer(CONFIG.MAP.TILE_LAYER, { attribution: 'Tiles &copy; Esri' }).addTo(map);

        // Marcador Central
        marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);
        
        // Cuadro Rojo (AOI)
        square = L.polygon([], { color: 'red', fillOpacity: 0.1, weight: 2 }).addTo(map);

        return map;
    },

    getMap: () => map,
    getCenter: () => marker.getLatLng(),

    setCenter(lat, lng) {
        const newLatLng = [lat, lng];
        marker.setLatLng(newLatLng);
        map.setView(newLatLng);
    },

    // Dibuja el cuadro basado en el radio
    updateSquare(radius) {
        const center = marker.getLatLng();
        const dist = radius * Math.sqrt(2); 
        
        // Función auxiliar para calcular coordenadas destino
        const getDest = (lat, lng, d, brng) => {
            const R = 6378137; // Radio Tierra
            const rad = Math.PI / 180;
            const latRad = lat * rad, lngRad = lng * rad, brngRad = brng * rad;
            const latDest = Math.asin(Math.sin(latRad) * Math.cos(d / R) + Math.cos(latRad) * Math.sin(d / R) * Math.cos(brngRad));
            const lngDest = lngRad + Math.atan2(Math.sin(brngRad) * Math.sin(d / R) * Math.cos(latRad), Math.cos(d / R) - Math.sin(latRad) * Math.sin(latDest));
            return L.latLng(latDest / rad, lngDest / rad);
        };

        const p1 = getDest(center.lat, center.lng, dist, 45);
        const p2 = getDest(center.lat, center.lng, dist, 135);
        const p3 = getDest(center.lat, center.lng, dist, 225);
        const p4 = getDest(center.lat, center.lng, dist, 315);

        square.setLatLngs([p1, p2, p3, p4]);

        // Retorna área en km2 si existe la función exacta, si no, usa matemática simple
        // AGREGAMOS LA VERIFICACIÓN: && typeof L.GeometryUtil.geodesicArea === 'function'
        if (typeof L.GeometryUtil !== 'undefined' && typeof L.GeometryUtil.geodesicArea === 'function') {
            return (L.GeometryUtil.geodesicArea(square.getLatLngs()[0]) / 1e6).toFixed(2);
        }
        
        // Fallback: Área de un cuadrado (Lado x Lado)
        // El lado es el radio * 2 (aprox)
        return ((radius * 2) * (radius * 2) / 1e6).toFixed(2);
    },

    getBBox() {
        const b = square.getBounds();
        return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    },

    addLayer(url) {
        if (currentLayer) map.removeLayer(currentLayer);
        if (url) {
            currentLayer = L.tileLayer(url).addTo(map);
        }
    },

    onMove(cb) {
        map.on('moveend', cb);
        marker.on('dragend', cb);
    }
};