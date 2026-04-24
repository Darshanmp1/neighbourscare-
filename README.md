# Neighbours Care

Neighbours Care is a full-stack community emergency response platform. It helps a resident report an emergency, finds nearby volunteers, and coordinates the response through real-time updates, geospatial search, and fallback notifications.

The project is intentionally interview-friendly because it combines product thinking with practical backend concerns:

- role-based access control for `user`, `volunteer`, and `admin`
- MongoDB geospatial queries for location-aware matching
- Socket.IO for real-time incident updates
- email and SMS fallbacks for volunteers who are offline

## What The App Does

### User flow
- Register and log in.
- Report emergencies manually or through one-click presets such as fire, robbery, assault, and ambulance.
- Attach live coordinates from the browser.
- Track incident status and assigned volunteer details.

### Volunteer flow
- Receive nearby incident alerts.
- Share live location from the browser.
- Accept an incident, navigate with Google Maps, and mark it resolved.

### Admin flow
- Manage all incidents and users across the platform.
- Promote or demote roles.
- Activate or deactivate accounts.
- Export incident or user data to CSV.

## Architecture Snapshot

```text
+------------------+        HTTP / WebSocket        +-----------------------+
| React + Vite UI  | <---------------------------> | Node.js + Express API |
| Role dashboards  |                               | Socket.IO server      |
| Leaflet map      |                               | Auth / Incidents      |
+------------------+                               | Admin / Notifications |
         |                                         +-----------+-----------+
         |                                                     |
         |                                                     |
         v                                                     v
+----------------------+                           +------------------------+
| Browser Geolocation  |                           | MongoDB + Mongoose     |
| localStorage JWT     |                           | Users + Incidents      |
+----------------------+                           | 2dsphere indexes       |
                                                   +-----------+------------+
                                                               |
                                                               v
                                         +----------------------------------+
                                         | External services                |
                                         | OpenStreetMap / SMTP / Twilio    |
                                         +----------------------------------+
```

## Core Design Choices

| Choice | Why It Fits This Project | Trade-off |
| --- | --- | --- |
| Monolithic Node.js backend | Faster to build and easier to explain in an interview MVP | API, socket, notification, and admin logic scale together |
| MongoDB with `2dsphere` indexes | Natural fit for location queries like "find volunteers near this incident" | Harder to enforce relational constraints than SQL |
| JWT auth | Simple stateless auth for API + Socket.IO | Current implementation stores token in `localStorage`, which is simpler but less secure than `httpOnly` cookies |
| Multi-channel notifications | Realistic fallback path: socket first, email/SMS if offline | More moving parts and more operational failure points |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, React Hot Toast |
| Maps | Leaflet, React Leaflet |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| Validation | express-validator |
| Notifications | Nodemailer, Twilio |
| Geocoding | OpenStreetMap Nominatim via Axios |

## Repository Layout

```text
neighbourcare/
|-- backend/
|   |-- config/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- utils/
|   `-- index.js
|-- frontend/
|   `-- src/
|-- README.md
|-- PROJECT_SUMMARY.md
`-- INTERVIEW_READY_GUIDE.md
```

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/neighbourscare
JWT_SECRET=replace-with-a-secure-secret
JWT_EXPIRE=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

ALERT_RADIUS_METERS=5000
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run the app

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

### 4. Run tests
```bash
cd backend
npm test
```

### 5. Run with Docker (Recommended for production)
```bash
docker compose up -d
```
The app will be available at `http://localhost:8080`.

## API Snapshot

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/location` - Used for real-time volunteer tracking
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### Incidents
- `POST /api/incidents` - Includes geospatial matching with $near query
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `PATCH /api/incidents/:id/status` - Updates status and triggers socket notifications
- `POST /api/incidents/:id/notes`
- `DELETE /api/incidents/:id`

### Socket events
- `incident:new` - Sent to nearby online volunteers
- `incident:statusUpdate` - Broadcast to relevant parties when status changes
- `volunteer:location` - Volunteers emit this to share live presence
- `volunteer:locationUpdate` - Backend re-emits this to reporters for live tracking

## Project Health & Reliability

This project followed a rigorous health-check process to ensure production readiness:

- **Automated Testing**: Integrated Jest and `mongodb-memory-server` for reliable geospatial unit tests.
- **Log Sanitization**: Sensitive URIs and credentials are filtered from logs.
- **Real-Time Reactive UI**: Volunteer tracking is now fully reactive via Socket.IO, replacing simulated loops with real event-driven updates.
- **Strict Validation**: All endpoints uses `express-validator` and standard HTTP status codes.

## Repository Layout

```text
neighbourcare/
|-- backend/
|   |-- config/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- tests/        <-- Automated test suite
|   |-- utils/
|   `-- index.js
|-- frontend/
|   `-- src/
|-- README.md
|-- PROJECT_SUMMARY.md
`-- INTERVIEW_READY_GUIDE.md
```

## Documentation

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md): concise product, architecture, data, and API summary
