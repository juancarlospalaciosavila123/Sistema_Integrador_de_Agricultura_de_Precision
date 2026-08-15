import { CONFIG } from './config.js';

/**
 * Manejador de Peticiones HTTP (Fetch)
 */
export const API = {
    // Helper para manejar errores
    async _post(endpoint, data) {
        try {
            const res = await fetch(`${CONFIG.API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`Error ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    async procesarEstudio(payload) {
        return this._post(CONFIG.ENDPOINTS.PROCESAR, payload);
    },

    async obtenerCapa(payload) {
        return this._post(CONFIG.ENDPOINTS.CAPA_PERIODICA, payload);
    },

    async guardarMonitoreo(email, center) {
        return this._post(CONFIG.ENDPOINTS.GUARDAR_MONITOREO, { email, center });
    },

    async ejecutarSimulacro(email) {
        return this._post(CONFIG.ENDPOINTS.SIMULACRO, { email });
    },

    // Geocodificación (Externa a OpenStreetMap)
    async obtenerNombreLugar(lat, lng) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const res = await fetch(url);
            const data = await res.json();
            return data.address || null;
        } catch (e) {
            return null;
        }
    }
};