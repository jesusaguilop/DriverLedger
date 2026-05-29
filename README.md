# 🚛 DriverLedger — FMCSA ELD Trip Planner

DriverLedger is a full-stack trip planning application for truck drivers that complies with FMCSA Hours of Service (HOS) regulations. It generates detailed trip plans with route maps, stop summaries, and daily log sheets in PDF format.

## Tech Stack

| Layer      | Technology                                                                |
|------------|---------------------------------------------------------------------------|
| Backend    | Python + Django REST Framework + Gunicorn                                 |
| Frontend   | React 18 + TypeScript + Vite + Tailwind CSS + Leaflet                     |
| External APIs | Nominatim (geocoding), OSRM (routing)                                 |

## Requirements

- **Node.js** 18+ and npm
- **Python** 3.10+
- Internet connection (for geocoding and routing APIs)

## Setup

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

The frontend opens at `http://localhost:5173` and the backend runs on `http://localhost:8000`.

## Usage

1. Open the app in your browser.
2. Enter the origin, pickup, and dropoff locations (Nominatim autocomplete).
3. Set your current cycle hours used (0–70 hrs).
4. Click **Plan Trip**.
5. The plan includes:
   - **Route map** with stops and color-coded legend.
   - **Stop timeline** (pickup, dropoff, fuel, rest, break).
   - **Metric cards** (total distance, driving hours, trip days).
   - **Daily log sheets** compliant with FMCSA standards, featuring a 24h bar chart, per-status totals, and a 70h/8-day recap table.
   - **PDF downloads** — single day or all days at once.
6. If the 70-hour cycle limit is exceeded, a violation is reported.

## HOS Regulations Implemented

- **11-hour** daily driving limit
- **14-hour** service window (duty window)
- **30-minute** break after 8 hours of driving
- **10-hour** off-duty rest period
- **70-hour / 8-day** cycle limit (absolute accumulation with violation reporting)
- Pre-trip and post-trip inspections included

## Stop Types

| Type       | Color    | Description                       |
|------------|----------|-----------------------------------|
| Pickup     | Blue     | Load cargo                        |
| Dropoff    | Green    | Unload cargo                      |
| Fuel       | Orange   | Fuel stop                         |
| Rest       | Purple   | 10-hour off-duty rest             |
| Break      | Teal     | 30-minute break                   |

## Deployment

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

The `dist/` directory contains the static files ready for deployment.

## Environment Variables

Copy the `.env.example` file to `.env` and adjust values:

```bash
cp .env.example .env   # macOS/Linux
copy .env.example .env # Windows
```

| Variable                | Default                                                | Description                         |
|-------------------------|--------------------------------------------------------|-------------------------------------|
| `DJANGO_SECRET_KEY`     | `django-insecure-eld-trip-planner-dev-…`               | Django secret key (change in prod)  |
| `DEBUG`                 | `True`                                                 | Django debug mode                   |
| `DJANGO_ALLOWED_HOSTS`  | `localhost,127.0.0.1`                                  | Allowed hostnames                   |
| `DJANGO_SETTINGS_MODULE`| `eldplanner.settings`                                  | Django settings module path         |
| `VITE_API_URL`          | `/api`                                                 | Backend API base URL (frontend)     |

> **Note:** The `.env` file is already in `.gitignore` and will not be committed. The backend automatically loads variables from the root `.env` file when it starts.

## Project Structure

```
DriveLedger/
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── .gitignore
├── backend/
│   ├── api/
│   │   ├── hos_calculator.py   # HOS engine (state machine)
│   │   ├── views.py            # /plan-trip/ REST endpoint
│   │   ├── urls.py             # API routes
│   │   └── log_generator.py    # Printable log sheet generation
│   ├── eldplanner/             # Django configuration
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TripForm.tsx     # Input form
│   │   │   ├── RouteMap.tsx     # Leaflet map with route & stops
│   │   │   ├── StopsSummary.tsx # Stop timeline
│   │   │   └── LogSheet.tsx     # FMCSA daily log sheet
│   │   ├── hooks/
│   │   │   └── useTripPlan.ts   # API call hook
│   │   ├── types/
│   │   │   └── trip.ts          # TypeScript types
│   │   └── App.tsx              # Main orchestrator
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── README.md
```

## API

### `POST /api/plan-trip/`

**Request:**
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

## License

Internal use. Do not redistribute without authorization.
