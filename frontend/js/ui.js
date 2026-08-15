/**
 * Gestor de Interfaz (Tablas y DOM)
 */
const els = {
    lat: document.getElementById('latInput'),
    lng: document.getElementById('lngInput'),
    place: document.getElementById('placeName'),
    results: document.getElementById('results-content'),
    area: document.getElementById('aoi-area'),
    info: document.getElementById('info')
};

export const UI = {
    updateCoords(lat, lng) {
        if(els.lat) els.lat.value = lat.toFixed(5);
        if(els.lng) els.lng.value = lng.toFixed(5);
    },

    updatePlace(addr) {
        if (!els.place) return;
        if (!addr) { els.place.innerText = "📍 Lugar desconocido"; return; }
        
        const loc = addr.hamlet || addr.village || addr.neighbourhood || addr.suburb || "";
        const mun = addr.city || addr.town || addr.municipality || "";
        const st = addr.state || "";
        
        let txt = (loc && loc !== mun) ? `📍 ${loc}, ${mun}, ${st}` : `📍 ${mun}, ${st}`;
        els.place.innerText = txt;
    },

    updateArea(val) { if(els.area) els.area.textContent = `Área: ${val} km²`; },
    
    showLoader(msg) { els.results.innerHTML = `<p style="text-align:center; padding:20px;">⏳ ${msg}</p>`; },
    
    showError(msg) { alert(msg); },

    showInfo(msg) { 
        if(els.info) els.info.innerHTML = msg; 
    },

    renderResults(data, onMapClick) {
        const avg = data.overall_mean_ndvi !== null ? data.overall_mean_ndvi.toFixed(7) : "N/A";
        
        let html = `
            <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center; border:1px solid #ddd; margin-bottom:15px;">
                <p style="margin:0;">Promedio General</p>
                <strong style="font-size:1.8em; color:#1a9850;">${avg}</strong>
            </div>
            
            <h4>1. Evolución Anual</h4>
            ${this._tableYear(data.monthly_data)}
            
            <h4 style="margin-top:20px;">2. Análisis Estacional</h4>
            ${this._tableSeasonal(data.monthly_data)}
        `;
        
        els.results.innerHTML = html;
        this._attachEvents(onMapClick);
    },

    // ---------------------------------------------------------
    // --- LÓGICA DE AÑOS Y MESES ACTUALIZADA ---
    // ---------------------------------------------------------
    _tableYear(data) {
        if (!data) return "<p>Sin datos</p>";
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // 1. Mapa de valores previos para comparar meses (incluso Enero vs Dic anterior)
        const sortedData = [...data].sort((a, b) => a.label.localeCompare(b.label));
        const prevValuesMap = {}; 
        sortedData.forEach((d, idx) => {
            if (idx > 0) prevValuesMap[d.label] = sortedData[idx - 1].mean_ndvi;
        });

        // 2. Agrupar por años
        const byYear = {};
        data.forEach(d => {
            const y = d.label.split('-')[0];
            if(!byYear[y]) byYear[y] = { total:0, count:0, months:[] };
            if(d.mean_ndvi !== null) { byYear[y].total += d.mean_ndvi; byYear[y].count++; }
            byYear[y].months.push(d);
        });

        const years = Object.keys(byYear).sort();
        let rows = "";

        years.forEach((y, i) => {
            const curr = byYear[y];
            const avg = curr.count > 0 ? (curr.total / curr.count) : null;
            
            // --- COLORES DEL AÑO (Umbral 0.1) ---
            let status = "Inicio"; 
            let yearColor = "#fff";

            if (i > 0) {
                const prev = byYear[years[i-1]];
                const prevAvg = prev.count > 0 ? (prev.total / prev.count) : null;
                
                if(avg !== null && prevAvg !== null) {
                    const diff = avg - prevAvg;
                    if(diff >= 0.1) { status = "🌲 Mejora"; yearColor = "#d4edda"; } // Verde
                    else if(diff <= -0.1) { status = "🚨 Caída"; yearColor = "#f8d7da"; } // Rojo
                    else { status = "⚖️ Estable"; yearColor = "#d1ecf1"; } // Azul
                }
            }

            rows += `<tr class="header-row" data-id="y-${y}" style="background:${yearColor}; font-weight:bold; cursor:pointer; border-bottom: 1px solid #ccc;">
                <td style="padding: 10px;">▶ Año ${y}</td>
                <td>${avg ? avg.toFixed(3) : '-'}</td>
                <td>${status}</td>
            </tr>`;
            
            // --- COLORES DE LOS MESES (Umbral 0.002) ---
            curr.months.sort((a,b)=>a.label.localeCompare(b.label)).forEach(m => {
                const monthIndex = parseInt(m.label.split('-')[1]) - 1;
                const monthName = monthNames[monthIndex];
                
                // Comparación con el mes inmediatamente anterior
                const val = m.mean_ndvi;
                const prevVal = prevValuesMap[m.label];
                let monthColor = "#fafafa"; // Gris muy claro por defecto
                let trendIcon = "";

                if (val !== null && prevVal != null) {
                    const diff = val - prevVal;
                    // Umbral fino de 0.002
                    if (diff >= 0.002) { 
                        monthColor = "#e8f5e9"; // Verde suave
                        trendIcon = "<span style='color:green; font-size:0.8em;'>▲</span>";
                    } else if (diff <= -0.002) { 
                        monthColor = "#ffebee"; // Rojo suave
                        trendIcon = "<span style='color:red; font-size:0.8em;'>▼</span>";
                    } else { 
                        monthColor = "#f0f8ff"; // Azul muy suave (AliceBlue)
                        trendIcon = "<span style='color:blue; font-size:0.8em;'>=</span>";
                    }
                }

                rows += `<tr class="child-row y-${y}" style="display:none; background:${monthColor}; border-bottom:1px solid #eee;" data-label="${m.label}" data-ok="${m.image_count>0}">
                    <td style="padding-left:30px; color:#555;">📅 ${monthName}</td>
                    <td>
                        ${val ? val.toFixed(3) : '-'} 
                        ${trendIcon}
                    </td>
                    <td>
                        ${m.image_count > 0 ? '<span style="color:#333; text-decoration:underline; font-size:0.9em;">Ver Mapa</span>' : '☁️'}
                    </td>
                </tr>`;
            });
        });

        return `<div class="table-container"><table class="data-table"><thead><tr><th>Periodo</th><th>Promedio</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },

// ---------------------------------------------------------
    // --- TABLA ESTACIONAL (MES A MES) CON SEMÁFORO ---
    // ---------------------------------------------------------
    _tableSeasonal(data) {
        if (!data) return "";
        
        // Agrupar por meses (0=Enero, 1=Febrero...)
        const months = Array.from({length:12}, ()=>[]);
        const names = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        
        data.forEach(d => {
            months[parseInt(d.label.split('-')[1])-1].push(d);
        });

        let rows = "";
        
        months.forEach((group, idx) => {
            if(group.length===0) return;
            
            // Encabezado del Mes (Ej: ▶ 📅 Enero)
            rows += `<tr class="header-row" data-id="m-${idx}" style="background:#e9ecef; cursor:pointer; border-bottom: 2px solid #ccc;">
                <td colspan="3" style="padding:10px; font-weight:bold; color:#495057;">▶ 📅 ${names[idx]} (Ver Histórico)</td>
            </tr>`;
            
            // Filas de los Años dentro de ese mes
            group.forEach((m, i) => {
                let diffHtml = '<span style="color:#aaa">Inicio</span>';
                let rowColor = "#fff"; // Blanco por defecto

                // Comparamos con el mismo mes del año anterior registrado
                if(i > 0 && m.mean_ndvi !== null && group[i-1].mean_ndvi !== null) {
                    const diff = m.mean_ndvi - group[i-1].mean_ndvi;
                    const umbral = 0.02; // Umbral solicitado

                    if(diff >= umbral) {
                        // VERDE (Mejora)
                        rowColor = "#d4edda"; 
                        diffHtml = `<span style="color:#155724; font-weight:bold;">▲ +${diff.toFixed(3)}</span>`;
                    } 
                    else if(diff <= -umbral) {
                        // ROJO (Caída)
                        rowColor = "#f8d7da"; 
                        diffHtml = `<span style="color:#721c24; font-weight:bold;">▼ ${diff.toFixed(3)}</span>`;
                    } 
                    else {
                        // AZUL (Estable)
                        rowColor = "#d1ecf1"; 
                        diffHtml = `<span style="color:#0c5460; font-weight:bold;">= Estable</span>`;
                    }
                }

                // Generamos la fila
                rows += `<tr class="child-row m-${idx}" style="display:none; background:${rowColor}; border-bottom:1px solid #ddd;" data-label="${m.label}" data-ok="${m.image_count>0}">
                    <td style="padding-left:20px;">${m.label.split('-')[0]}</td> <td>${m.mean_ndvi ? m.mean_ndvi.toFixed(3) : '-'}</td>
                    <td>${diffHtml}</td>
                </tr>`;
            });
        });

        // Retornamos la tabla completa con encabezados ajustados
        return `<div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="background:#34495e;">Año</th>
                        <th style="background:#34495e;">Valor</th>
                        <th style="background:#34495e;">Comparativa vs Año Ant.</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    
    _attachEvents(cb) {
        document.querySelectorAll('.header-row').forEach(row => {
            row.onclick = () => {
                const id = row.dataset.id;
                document.querySelectorAll(`.${id}`).forEach(r => r.style.display = r.style.display==='none'?'table-row':'none');
            };
        });
        document.querySelectorAll('.child-row').forEach(row => {
            row.onclick = () => {
                if(row.dataset.ok === "true") {
                    document.querySelectorAll('tr').forEach(r=>r.style.outline='none');
                    row.style.outline = '2px solid #333';
                    if(cb) cb(row.dataset.label);
                } else alert("Sin imagen disponible");
            };
        });
    }
};