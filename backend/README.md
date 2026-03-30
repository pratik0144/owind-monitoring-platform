# OWind Backend Telemetry System

IoT wind turbine monitoring platform backend.

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm start
```

Server runs on `http://localhost:3000`

## API Endpoints

### POST /api/turbine
Insert turbine telemetry data.

```bash
curl -X POST http://localhost:3000/api/turbine \
  -H "Content-Type: application/json" \
  -d '{"wind_speed": 12.5, "rpm": 150, "voltage": 24.5, "current": 2.1, "power": 51.45}'
```

### GET /api/latest
Get the latest turbine record.

```bash
curl http://localhost:3000/api/latest
```

### GET /api/history
Get the last 200 records.

```bash
curl http://localhost:3000/api/history
```

## Database

SQLite database stored at `database/owind.db`

**Table: turbine_data**
| Column     | Type    |
|------------|---------|
| id         | INTEGER |
| timestamp  | DATETIME|
| wind_speed | REAL    |
| rpm        | INTEGER |
| voltage    | REAL    |
| current    | REAL    |
| power      | REAL    |
