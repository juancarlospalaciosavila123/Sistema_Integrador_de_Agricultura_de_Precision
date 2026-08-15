Sistema Integrador de Agricultura de Precisión (Módulo "Vigilante") 

 Descripción Ejecutiva
 El Sistema Integrador de Agricultura de Precisión es una plataforma web proactiva diseñada para el monitoreo automatizado de la cobertura vegetal. A diferencia de las herramientas SIG de escritorio tradicionales que requieren análisis manuales, este sistema implementa un agente autónomo (Módulo "Vigilante") que evalúa continuamente la salud de los cultivos.Utilizando imágenes satelitales de reflectancia superficial (Level-2) de las misiones Landsat 8 y 9, la plataforma calcula el Índice de Vegetación de Diferencia Normalizada (NDVI). Si el sistema detecta una anomalía o caída crítica en el vigor vegetativo (umbral predefinido de -0.02), detona alertas tempranas vía correo electrónico, traduciendo coordenadas geográficas en direcciones físicas exactas (geocodificación inversa) para facilitar una respuesta operativa inmediata en campo.
 
 Stack Tecnológico
 El proyecto está construido bajo una arquitectura modular orientada a Arquitectura Cliente-Servidor:
 
 Backend (Lógica de Negocio y Procesamiento)
    Python 3.9+: Lenguaje principal del servidor.
    Flask: Micro-framework web para el manejo de rutas y API REST.
    Google Earth Engine (GEE) Python API: Motor de procesamiento geoespacial masivo en la nube.
    APScheduler: Planificador avanzado para la ejecución de tareas en segundo plano (Módulo Vigilante).
    SMTP: Protocolo estándar para el envío de alertas automáticas por correo electrónico.
 Frontend (Interfaz de Usuario)
    HTML5 / CSS3 / JavaScript (ES6): Estructura, diseño y lógica del lado del cliente.
    Leaflet.js: Librería de mapas interactivos para la delimitación del Área de Interés (AOI).
    Nominatim API (OpenStreetMap): Servicio de geocodificación inversa.⚙️ 
    
Arquitectura del Sistema
El sistema opera bajo un modelo Cliente-Servidor (Server-Side Processing) para eliminar la dependencia de hardware local de alto rendimiento:

    Frontend (Cliente): A través del visor cartográfico interactivo de Leaflet, el usuario delimita su parcela o bosque (AOI) y establece los parámetros de tiempo. Mediante Fetch API, el navegador envía solicitudes asíncronas seguras con las coordenadas geométricas al servidor.
    Backend (Servidor): Flask recibe la petición y autentica el acceso a los clústeres de Google Earth Engine mediante Service Accounts.
    Procesamiento (GEE): Se extraen las colecciones de Landsat 8/9, se aplica una máscara de nubosidad y se calcula el NDVI. Los resultados matemáticos retornan al backend.
    Automatización: El módulo APScheduler corre en segundo plano de manera cíclica, consultando la base de datos local y el catálogo satelital. Si la variabilidad temporal del NDVI indica deforestación o estrés hídrico, se activa la lógica de alerta y se despacha el reporte al usuario final
    
Guía de Instalación y Despliegue
Sigue estos pasos para ejecutar el sistema en un entorno local.

Prerrequisitos
    Tener instalado Python 3.8 o superior.
    Tener instalados pip y git.
    Una cuenta activa de Google Earth Engine y un archivo de credenciales de cuenta de servicio (credenciales-gee.json).
    
1. Clonar el repositorio
Abre tu terminal y clona este proyecto en tu máquina local:
git clone https://github.com/juancarlospalaciosavila123/Sistema_Integrador_de_Agricultura_de_Precision.git
cd Sistema_Integrador_de_Agricultura_de_Precision

2. Crear un entorno virtual (Recomendado)
Para evitar conflictos de dependencias, crea y activa un entorno virtual de Python:
# En Windows
python -m venv venv
venv\Scripts\activate

# En macOS/Linux
python3 -m venv venv
source venv/bin/activate

3. Instalar las dependencias
Instala todas las librerías necesarias ejecutando el siguiente comando:
pip install -r requirements.txt

4. Configurar Variables de Entorno y Credenciales
    Ubica en la raíz del proyecto (o en la carpeta configurada para ello) tu archivo de credenciales de Google Earth Engine.
    Renombra tu archivo JSON a credenciales-gee.json (o actualiza la ruta dentro del módulo gee_service.py / config.py).
    Configura tus credenciales de correo emisor (SMTP) en el archivo de configuración correspondiente (ej. config.py o .env).

5. Levantar el Servidor Local
Ejecuta el archivo principal de Flask para iniciar el servidor y el planificador de tareas:
python app.py
Si la conexión es exitosa, verás en la consola que el servidor Flask está corriendo y el módulo "Vigilante" (APScheduler) ha iniciado.

6. Acceder a la Interfaz
Abre tu navegador web de preferencia e ingresa a la siguiente dirección:
http://127.0.0.1:5000
¡El sistema ya está listo para monitorear!Proyecto desarrollado para la obtención del grado de Ingeniero en Sistemas Computacionales.


Demostración del Sistema
Puedes ver la plataforma en acción, la delimitación interactiva de parcelas y cómo el módulo "Vigilante" dispara las alertas en tiempo real en el siguiente enlace:
👉 [**Ver Demostración Técnica en YouTube**](https://youtu.be/JU3y0tBvoYc)