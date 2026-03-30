# 🌀 OWind – Urban Wind Turbine Placement Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org/)
[![Mapbox](https://img.shields.io/badge/Mapbox-GL%20JS-000000?logo=mapbox)](https://www.mapbox.com/)

**OWind** is an intelligent urban wind analysis platform that helps identify optimal locations for small-scale wind turbines on building rooftops. By combining real-time wind data, 3D building visualization, and physics-based simulation, OWind provides actionable recommendations for urban wind energy deployment.

---

## 📋 Table of Contents

- [Features](#-features)
- [System Architecture](#-system-architecture)
- [How the Analysis Works](#-how-the-analysis-works)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Integrations](#-api-integrations)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Future Improvements](#-future-improvements)
- [License](#-license)
- [Author](#-author)

---

## ✨ Features

### Wind Analysis
- **Real-time wind data** from Open-Meteo API (speed, direction)
- **Wind flow visualization** with animated particle streamlines
- **Wind intensity coloring** based on speed thresholds

### Building Detection
- **Automatic building detection** using OpenStreetMap/Overpass API
- **Simplified 5-building environment** (target + N/S/E/W neighbors)
- **3D building extrusion** with accurate heights

### Turbine Placement Engine
- **Physics-based wind modeling** with urban effects:
  - Upwind building reduction (40%)
  - Gap acceleration (20%)
  - Roof edge speed-up (15%)
  - Wake zone reduction (50%)
- **Roof zone evaluation** (north/south/east/west edges + center)
- **Power output estimation** using standard turbine formula

### Interactive Map
- **Mapbox GL JS** with 3D perspective view
- **Location search** with Mapbox Geocoder
- **Click-to-analyze** functionality
- **Rotatable/tiltable 3D view**

### IoT Telemetry Dashboard
- **Real-time turbine monitoring** (wind speed, RPM, voltage, current, power)
- **Historical data charts** with Chart.js
- **Energy analytics** and statistics

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OWind Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────────────┐    │
│  │   React Frontend │          │   Node.js Backend        │    │
│  │                  │          │                          │    │
│  │  • MapAnalysis   │  HTTP    │  • Express Server        │    │
│  │  • Dashboard     │◄────────►│  • SQLite Database       │    │
│  │  • Charts        │          │  • Telemetry API         │    │
│  │  • WindStream    │          │                          │    │
│  └────────┬─────────┘          └──────────────────────────┘    │
│           │                                                     │
│           │ API Calls                                           │
│           ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   External APIs                          │   │
│  │                                                          │   │
│  │  • Open-Meteo API ──────► Wind speed & direction        │   │
│  │  • Overpass API ────────► Building footprints           │   │
│  │  • Mapbox API ──────────► Maps & Geocoding              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Stack
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Mapbox GL JS | Interactive 3D maps |
| Chart.js | Data visualization |
| Axios | HTTP client |

### Backend Stack
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | API framework |
| SQLite (sql.js) | Telemetry database |
| CORS | Cross-origin support |

### Core Modules
| Module | Responsibility |
|--------|----------------|
| `WindService.js` | Fetch & process wind data from Open-Meteo |
| `WindSimulation.js` | Urban wind interaction physics |
| `PlacementEngine.js` | Turbine placement scoring algorithm |
| `WindStreamLayer.js` | Animated wind particle visualization |
| `MapAnalysis.js` | Main analysis UI component |

---

## 🔄 How the Analysis Works

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  1. Select  │───►│  2. Fetch   │───►│  3. Fetch   │───►│ 4. Simplify │
│  Location   │    │  Wind Data  │    │  Buildings  │    │ Environment │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│ 7. Display  │◄───│ 6. Calculate│◄───│ 5. Simulate │◄──────────┘
│ Recommend.  │    │  Placement  │    │  Wind Flow  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Step-by-Step Pipeline

1. **Location Selection**
   - User clicks on map or searches for an address
   - Coordinates are captured for analysis

2. **Wind Data Fetch**
   - Query Open-Meteo API for current wind conditions
   - Extract wind speed (m/s) and direction (degrees)
   - Convert direction to 2D vector for simulation

3. **Building Detection**
   - Query Overpass API for buildings within 200m radius
   - Parse OpenStreetMap data into GeoJSON polygons
   - Extract building heights from tags

4. **Environment Simplification**
   - Identify target building (closest to click point)
   - Find nearest neighbor in each cardinal direction
   - Create 5-building simplified environment

5. **Wind Flow Simulation**
   - Apply urban wind physics rules
   - Calculate wind modifications from neighboring buildings
   - Generate animated particle streamlines

6. **Placement Calculation**
   - Evaluate each roof zone (N/S/E/W edges + center)
   - Score based on: `windSpeed × exposure × turbulencePenalty`
   - Estimate power output: `P = 0.5 × ρ × A × v³ × η`

7. **Recommendation Display**
   - Show optimal turbine location on 3D map
   - Display expected wind speed and power output
   - Visualize with animated turbine marker

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Mapbox account (free tier works)

### Clone Repository

```bash
git clone https://github.com/yourusername/owind-software.git
cd owind-software
```

### Backend Setup

```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### Run Telemetry Simulator (Optional)

```bash
cd backend
node simulator.js
```

Sends simulated turbine data every 5 seconds.

---

## ⚙️ Configuration

### Mapbox Token

Create a `.env` file in the `frontend/` directory:

```env
REACT_APP_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Get your token at [mapbox.com/account/access-tokens](https://account.mapbox.com/access-tokens/)

### Backend Port

Default: `3001`. Modify in `backend/server.js` if needed.

---

## 🔌 API Integrations

### Mapbox GL JS
- **Purpose**: Interactive map rendering, 3D buildings, geocoding
- **Docs**: [docs.mapbox.com](https://docs.mapbox.com/mapbox-gl-js/)
- **Used for**: Base map, fill-extrusion layers, location search

### Open-Meteo API
- **Purpose**: Real-time weather and wind data
- **Docs**: [open-meteo.com/en/docs](https://open-meteo.com/en/docs)
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Data**: `wind_speed_10m`, `wind_direction_10m`
- **Cost**: Free, no API key required

### Overpass API
- **Purpose**: OpenStreetMap building data
- **Docs**: [wiki.openstreetmap.org/wiki/Overpass_API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- **Servers**: Primary + fallback for reliability
- **Data**: Building footprints, heights, levels
- **Cost**: Free, public servers

---

## 📁 Project Structure

```
owind-software/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── simulator.js           # IoT telemetry simulator
│   ├── package.json
│   ├── database/
│   │   └── db.js              # SQLite database setup
│   └── routes/
│       ├── turbine.js         # Telemetry CRUD endpoints
│       └── analytics.js       # Energy statistics endpoints
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js             # Main app with routing
│   │   ├── components/
│   │   │   ├── Dashboard.js   # Telemetry dashboard
│   │   │   ├── MapAnalysis.js # Main wind analysis component
│   │   │   ├── WindStreamLayer.js # Particle animation
│   │   │   ├── Charts.js      # Chart.js visualizations
│   │   │   ├── StatCard.js    # Dashboard stat cards
│   │   │   └── AnalyticsPanel.js
│   │   └── services/
│   │       ├── api.js         # Backend API client
│   │       ├── WindService.js # Wind data fetching
│   │       ├── WindSimulation.js # Physics calculations
│   │       └── PlacementEngine.js # Placement algorithm
│   ├── .env                   # Mapbox token (not committed)
│   └── package.json
│
└── README.md
```

---

## 📸 Screenshots

### Wind Analysis View
*3D building visualization with animated wind streamlines*

![Wind Analysis](docs/screenshots/wind-analysis.png)

### Turbine Placement Recommendation
*Optimal placement marker with power estimation*

![Placement](docs/screenshots/placement.png)

### IoT Dashboard
*Real-time turbine telemetry monitoring*

![Dashboard](docs/screenshots/dashboard.png)

> **Note**: Add screenshots to `docs/screenshots/` directory

---

## 🔮 Future Improvements

### Short Term
- [ ] Cache building data locally
- [ ] Add multiple turbine placement support
- [ ] Export analysis reports as PDF
- [ ] Mobile-responsive design

### Medium Term
- [ ] **Real CFD simulation** using WebGL compute shaders
- [ ] **Rooftop edge detection** from satellite imagery
- [ ] **Wind rose diagrams** for historical patterns
- [ ] **Multi-building analysis** for solar + wind hybrid

### Long Term
- [ ] **GPU-accelerated particle simulation** with WebGPU
- [ ] **Live IoT integration** via MQTT/WebSocket
- [ ] **Wind energy forecasting** with ML models
- [ ] **Urban wind mapping** for entire neighborhoods
- [ ] **Digital twin** integration for building management

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 Pratik Potadar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👤 Author

**Pratik**

- Project: OWind Monitoring Platform
- Purpose: Urban wind energy optimization

---

## 🙏 Acknowledgments

- [Mapbox](https://www.mapbox.com/) for mapping infrastructure
- [Open-Meteo](https://open-meteo.com/) for free weather data
- [OpenStreetMap](https://www.openstreetmap.org/) contributors for building data
- [Chart.js](https://www.chartjs.org/) for data visualization

---

<p align="center">
  <strong>🌬️ Harnessing urban wind, one rooftop at a time</strong>
</p>
