import { MapManager } from './map.js';
import { API } from './api.js';
import { UI } from './ui.js';

// Elementos
const slider = document.getElementById('radiusSlider');
const radiusLabel = document.getElementById('radiusLabel');
const btnCalc = document.getElementById('calculateBtn');
const startIn = document.getElementById('startDate');
const endIn = document.getElementById('endDate');
const latIn = document.getElementById('latInput');
const lngIn = document.getElementById('lngInput');
const btnSave = document.getElementById('btnGuardarMonitoreo');
const btnTest = document.getElementById('btnSimulacro');
const emailIn = document.getElementById('emailInput');

let currentRad = 500;

function init() {
    // 1. Mapa
    MapManager.init('map');
    
    // 2. Fechas Default
    const today = new Date().toISOString().split('T')[0];
    endIn.value = today;
    startIn.value = "2024-01-01"; // Ejemplo
    
    // 3. Sincronización inicial
    sync();
    
    // 4. Listeners
    setupEvents();
}

async function sync() {
    const center = MapManager.getCenter();
    const area = MapManager.updateSquare(currentRad);
    UI.updateCoords(center.lat, center.lng);
    UI.updateArea(area);
    const addr = await API.obtenerNombreLugar(center.lat, center.lng);
    UI.updatePlace(addr);
}

function setupEvents() {
    // Movimiento del mapa
    MapManager.onMove(() => sync());

    // Slider Radio
    slider.addEventListener('input', (e) => {
        currentRad = parseInt(e.target.value);
        radiusLabel.innerText = (currentRad/1000) + ' km';
        MapManager.updateSquare(currentRad);
        UI.updateArea(MapManager.updateSquare(currentRad));
    });

    // Inputs Manuales
    const manual = () => {
        const lat = parseFloat(latIn.value);
        const lng = parseFloat(lngIn.value);
        if(!isNaN(lat) && !isNaN(lng)) {
            MapManager.setCenter(lat, lng);
            sync();
        }
    };
    latIn.addEventListener('change', manual);
    lngIn.addEventListener('change', manual);

    // Calcular
    btnCalc.addEventListener('click', async () => {
        if(!startIn.value || !endIn.value) return alert("Faltan fechas");
        
        UI.showLoader("Analizando imágenes satelitales...");
        btnCalc.disabled = true;

        try {
            const data = await API.procesarEstudio({
                bbox: MapManager.getBBox(),
                startDate: startIn.value,
                endDate: endIn.value
            });

            if(data.status === 'success') {
                MapManager.addLayer(data.tileUrl);
                UI.renderResults(data, (label) => loadLayer(label));
                UI.showInfo("✅ Estudio completado");
            } else {
                UI.showError(data.message);
            }
        } catch(e) { UI.showError("Error de conexión"); }
        finally { btnCalc.disabled = false; }
    });

    // Monitoreo
    btnSave.addEventListener('click', async () => {
        const em = emailIn.value;
        if(!em || !em.includes('@')) return alert("Correo inválido");
        const c = MapManager.getCenter();
        
        btnSave.innerText = "Guardando...";
        try {
            await API.guardarMonitoreo(em, [c.lng, c.lat]);
            alert("✅ Vigilancia Activada");
        } catch(e) { alert("Error"); }
        finally { btnSave.innerText = "📡 Activar Vigilancia"; }
    });

    // Simulacro
    btnTest.addEventListener('click', async () => {
        const em = emailIn.value;
        if(!em) return alert("Escribe un correo arriba");
        
        btnTest.innerText = "Enviando...";
        try {
            const res = await API.ejecutarSimulacro(em);
            alert(res.message);
        } catch(e) { alert("Error"); }
        finally { btnTest.innerText = "🧪 Simulacro"; }
    });
}

async function loadLayer(label) {
    UI.showInfo(`⏳ Cargando capa: ${label}`);
    const data = await API.obtenerCapa({ q_label: label, bbox: MapManager.getBBox() });
    if(data.status === 'success') {
        MapManager.addLayer(data.tileUrl);
        UI.showInfo(`✅ Capa: ${label}`);
    }
}

document.addEventListener('DOMContentLoaded', init);