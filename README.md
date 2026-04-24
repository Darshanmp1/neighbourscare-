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

Frontend default Vite URL is usually `http://localhost:5173`.

## API Snapshot

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/location`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

### Incidents
- `POST /api/incidents`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `PATCH /api/incidents/:id/status`
- `POST /api/incidents/:id/notes`
- `DELETE /api/incidents/:id`

### Admin
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/role`
- `PATCH /api/admin/users/:id/status`
- `DELETE /api/admin/users/:id`

### Socket events
- `incident:new`
- `incident:statusUpdate`
- `incident:noteAdded`
- `volunteer:location`

## Current Scope And Honest Notes

- The strongest implemented flow is `report incident -> notify volunteers -> accept -> resolve`.
- Manual verification scripts exist in `backend/` for quick actions and admin features.
- A formal automated test suite is not set up yet.
- Notification preference toggles in the Settings screen are UI-only today.
- For a production-hardening pass, the biggest upgrades would be atomic incident assignment, stronger auth storage, rate limiting, and typed event contracts shared between frontend and backend.

## Documentation

- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md): concise product, architecture, data, and API summary
- [INTERVIEW_READY_GUIDE.md](./INTERVIEW_READY_GUIDE.md): full interview preparation guide with Q&A, trade-offs, and system design discussion

## Interview Angle

This project is a strong example of an MVP that solves a real community problem with:

- end-to-end ownership across frontend, backend, data, and real-time systems
- practical use of geospatial indexing
- role-based product design
- discussion-ready trade-offs around scale, reliability, and security
