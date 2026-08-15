import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from config import EMAIL_REMITENTE, EMAIL_PASSWORD

def obtener_direccion(lat, lng):
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}&zoom=10&addressdetails=1"
        headers = {'User-Agent': 'SistemaTesis/1.0'}
        r = requests.get(url, headers=headers, timeout=5)
        data = r.json()
        if 'address' in data:
            a = data['address']
            ciudad = a.get('city') or a.get('town') or a.get('municipality') or "Ubicación Rural"
            estado = a.get('state', '')
            return f"{ciudad}, {estado}"
        return "Coordenadas puras"
    except:
        return f"{lat}, {lng}"

def generar_html(tipo, ndvi_ayer, ndvi_hoy, lat, lng):
    diff = ndvi_hoy - ndvi_ayer
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    lugar = obtener_direccion(lat, lng)

    if tipo == "DEFORESTACION":
        titulo, color, icono = "🚨 ALERTA ROJA", "#c0392b", "📉"
        msj = "Caída crítica en vegetación detectada."
    elif tipo == "RECUPERACION":
        titulo, color, icono = "✅ RECUPERACIÓN", "#27ae60", "🌲"
        msj = "Aumento positivo en vegetación."
    else:
        titulo, color, icono = "🔵 ESTABILIDAD", "#2980b9", "⚖️"
        msj = "Sin cambios significativos."

    html = f"""
    <div style="font-family: Arial; border: 1px solid #ddd; max-width: 600px; margin: auto;">
        <div style="background:{color}; color:white; padding:15px; text-align:center;"><h2>{titulo}</h2></div>
        <div style="padding:20px;">
            <p>{msj}</p>
            <p><strong>📍 Lugar:</strong> {lugar} <br> <strong>📅 Fecha:</strong> {fecha}</p>
            <hr>
            <p>NDVI Anterior: <b>{ndvi_ayer:.3f}</b> <br> NDVI Actual: <b style="color:{color}">{ndvi_hoy:.3f}</b></p>
            <p>Variación: <b>{icono} {diff:+.3f}</b></p>
            <div style="text-align:center; margin-top:20px;">
                <a href="http://maps.google.com/?q={lat},{lng}" style="background:{color}; color:white; padding:10px; text-decoration:none; border-radius:5px;">Ver en Mapa</a>
            </div>
        </div>
    </div>
    """
    return f"[{tipo}] Reporte Satelital", html

def enviar_correo(destinatario, asunto, html):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_REMITENTE
        msg['To'] = destinatario
        msg['Subject'] = asunto
        msg.attach(MIMEText(html, 'html'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_REMITENTE, EMAIL_PASSWORD)
        server.sendmail(EMAIL_REMITENTE, destinatario, msg.as_string())
        server.quit()
        print(f"📧 Enviado a {destinatario}")
    except Exception as e:
        print(f"❌ Error email: {e}")