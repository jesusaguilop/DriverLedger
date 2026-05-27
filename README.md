# 🚛 DriverLedger — Planificador de Viajes FMCSA ELD

DriverLedger es una aplicación full-stack para planificar viajes de camiones cumpliendo con las regulaciones HOS (Hours of Service) de la FMCSA. Genera planes de viaje detallados con mapas de ruta, resúmenes de paradas y registros diarios (log sheets) en formato PDF.

## Stack Tecnológico

| Capa       | Tecnología                                                                 |
|------------|---------------------------------------------------------------------------|
| Backend    | Python + Django REST Framework + Gunicorn                                 |
| Frontend   | React 18 + TypeScript + Vite + Tailwind CSS + Leaflet                     |
| APIs externas | Nominatim (geocoding), OSRM (enrutamiento)                            |

## Requisitos

- **Node.js** 18+ y npm
- **Python** 3.10+
- Conexión a Internet (para geocoding y enrutamiento por API)

## Instalación

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend se abrirá en `http://localhost:5173` y el backend correrá en `http://localhost:8000`.

## Uso

1. Abre la aplicación en el navegador.
2. Ingresa las ubicaciones de origen, pickup y destino (autocompletado con Nominatim).
3. Indica las horas de ciclo usadas (0–70 hrs).
4. Haz clic en **Plan Trip**.
5. El plan incluye:
   - **Mapa de ruta** con paradas y leyenda de colores.
   - **Timeline de paradas** (pickup, dropoff, combustible, descanso, pausas).
   - **Tarjetas de métricas** (distancia total, horas de conducción, días de viaje).
   - **Log sheets diarios** conformes a la FMCSA con gráfico de barras de 24h, totales por status y tabla de recap de 70h/8 días.
   - **Descarga de PDFs** por día o de todos los días juntos.
6. Si se excede el límite de 70 horas de ciclo, se muestra una violación.

## Regulaciones HOS Implementadas

- **11 horas** máximas de conducción por día
- **14 horas** de ventana de servicio (duty window)
- **30 minutos** de pausa después de 8 horas de conducción
- **10 horas** de descanso fuera de servicio (off-duty)
- **70 horas / 8 días** de límite de ciclo (con acumulación absoluta y reporte de violaciones)
- Pre-trip y post-trip inspection incluidos

## Reglas de Paradas

| Tipo       | Color  | Descripción                            |
|------------|--------|----------------------------------------|
| Pickup     | Azul   | Carga de mercancía                     |
| Dropoff    | Verde  | Descarga de mercancía                  |
| Combustible| Naranja| Parada de combustible                  |
| Descanso   | Púrpura| Descanso de 10 horas (off-duty)        |
| Pausa      | Teal   | Pausa de 30 minutos                    |

## Despliegue

### Backend (Render / Railway / Fly.io)

```bash
cd backend
pip install -r requirements.txt
gunicorn eldplanner.wsgi:application --bind 0.0.0.0:$PORT
```

### Frontend (Vercel / Netlify)

```bash
cd frontend
npm run build
```

El directorio `dist/` contiene los archivos estáticos listos para desplegar.

## Variables de Entorno

| Variable            | Defecto                                  | Descripción                            |
|---------------------|------------------------------------------|----------------------------------------|
| `DJANGO_SECRET_KEY` | `django-insecure-eld-trip-planner-dev-…` | Clave secreta de Django (cambiar en prod) |
| `DEBUG`             | `True`                                   | Modo debug de Django                   |

## Estructura del Proyecto

```
DriveLedger/
├── backend/
│   ├── api/
│   │   ├── hos_calculator.py   # Motor HOS (state machine)
│   │   ├── views.py            # Endpoint REST /plan-trip/
│   │   ├── urls.py             # Rutas del API
│   │   └── log_generator.py    # Generación de logs imprimibles
│   ├── eldplanner/             # Configuración de Django
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TripForm.tsx     # Formulario de entrada
│   │   │   ├── RouteMap.tsx     # Mapa Leaflet con ruta y paradas
│   │   │   ├── StopsSummary.tsx # Timeline de paradas
│   │   │   └── LogSheet.tsx     # Log sheet diario FMCSA
│   │   ├── hooks/
│   │   │   └── useTripPlan.ts   # Hook de llamada al API
│   │   ├── types/
│   │   │   └── trip.ts          # Tipos TypeScript
│   │   └── App.tsx              # Orquestador principal
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

## API

### `POST /api/plan-trip/`

**Body:**
```json
{
  "current_location": "Los Angeles, CA",
  "pickup_location": "Phoenix, AZ",
  "dropoff_location": "Houston, TX",
  "current_cycle_used": 45
}
```

**Response:**
```json
{
  "total_distance_miles": 1576.2,
  "total_driving_hours": 32.2,
  "route_coordinates": [[34.05, -118.24], ...],
  "stops": [...],
  "daily_logs": [...],
  "violations": [],
  "summary": {
    "cycle_hours_used_after_trip": 77.0,
    "cycle_hours_remaining": 0.0,
    "days_needed": 3
  }
}
```

## Licencia

Uso interno. No redistribuir sin autorización.
