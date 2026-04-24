# Neighbours Care Project Summary

## Executive Summary

Neighbours Care is a location-aware emergency coordination platform built for neighborhood-level response. A resident can report an emergency from the browser, the backend finds nearby volunteers, and the system pushes alerts through Socket.IO, email, and SMS depending on who is online.

This project stands out because it combines:

- real-world product intent
- geospatial querying
- multi-role access control
- real-time communication
- operational trade-offs that are strong interview discussion material

## Problem And Solution

### Problem
- In many emergencies, the first few minutes matter.
- Professional responders may not arrive immediately.
- Neighbors who are nearby often do not know someone needs help.

### Solution
- Let users raise an incident with coordinates.
- Match volunteers close to the incident.
- Notify responders through the fastest available channel.
- Track the incident through `open -> in_progress -> resolved`.

## Primary Users

| Role | Responsibility | Main Screens |
| --- | --- | --- |
| User | Reports emergencies and tracks response | Login, Register, User Dashboard |
| Volunteer | Receives alerts, shares location, accepts incidents | Volunteer Dashboard |
| Admin | Manages all users and incidents across the platform | Admin Dashboard |

## Implemented Features

### User-facing
- quick emergency buttons for fire, robbery, assault, and ambulance
- manual incident reporting with title, description, priority, and GPS coordinates
- incident list with live status changes
- map-based visualization through Leaflet
- assigned volunteer details when someone accepts the incident

### Volunteer-facing
- open incident feed
- location sharing using browser geolocation
- distance-aware incident ordering on the frontend
- accept-and-resolve workflow
- Google Maps deep link for navigation

### Admin-facing
- global incident monitoring
- user listing, role changes, activation toggles, and deletion
- CSV export for users or incidents
- simple response-time KPI computation in the dashboard

## Architecture Summary

### Style
- single deployable monolith
- React SPA frontend
- REST API plus Socket.IO channel
- MongoDB-backed document store

### Why this architecture
- It is fast to build for an MVP.
- It keeps the incident lifecycle easy to reason about.
- It still demonstrates scalable concepts such as decoupled notification channels and indexed geo-search.

### High-level diagram

```text
User / Volunteer / Admin
          |
          v
React UI + Axios + Socket.IO Client
          |
          v
Express API + Socket.IO Server
  |        |         |         |
  |        |         |         +--> Email service
  |        |         +------------> SMS service
  |        +----------------------> Geocoder
  +-------------------------------> MongoDB
```

## Main Backend Modules

| Module | Responsibility | Key Files |
| --- | --- | --- |
| Authentication | Register, login, token validation, role checks | `backend/routes/auth.js`, `backend/middleware/auth.js` |
| Incident Management | Create, list, update, note, delete incidents | `backend/routes/incidents.js`, `backend/models/Incident.js` |
| Admin Management | Global user and incident control | `backend/routes/admin.js` |
| Notifications | Email and SMS fallbacks | `backend/services/emailService.js`, `backend/services/smsService.js` |
| Realtime | Socket authentication and rooms | `backend/socket.js`, `backend/middleware/socketAuth.js` |
| Geocoding | Derive address from coordinates | `backend/utils/geocoder.js` |

## Data Model Summary

### User
- identity fields: `name`, `email`, `password`
- role field: `user`, `volunteer`, `admin`
- location stored as GeoJSON `Point`
- activity fields: `isActive`, `lastSeen`

### Incident
- `reporter` reference to `User`
- title, description, priority, status
- incident location stored as GeoJSON `Point`
- `assignedVolunteer` reference
- timestamps for response and resolution
- embedded `notes`
- embedded `notifiedVolunteers` log

### Why this shape
- references are used where ownership crosses aggregates
- notes and notification logs are embedded because they are incident-local and read together

## Core Data Flow

### Registration
1. Frontend collects user details.
2. Optional location is captured from the browser.
3. Backend validates input and hashes the password.
4. Geocoder derives `address` when coordinates exist.
5. For admins, the backend enforces a single admin role.
6. JWT is returned and stored by the frontend.

### Incident creation
1. User submits a quick action or manual report.
2. Backend creates the incident with location.
3. MongoDB runs a geospatial query to find nearby active volunteers.
4. Online volunteers receive socket alerts.
5. Offline volunteers receive email, and optionally SMS.
6. High and critical incidents also trigger SMS for online volunteers who have a phone number.

### Incident response
1. Volunteer opens the incident feed.
2. Volunteer accepts the incident by setting status to `in_progress`.
3. Backend records `responseTime` and `assignedVolunteer`.
4. Reporter and other clients receive status updates.
5. Volunteer marks the incident resolved.
6. Backend records `resolvedAt`.

## API Summary

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/location`, `PUT /api/auth/profile`, `PUT /api/auth/password` |
| Incidents | `POST /api/incidents`, `GET /api/incidents`, `GET /api/incidents/:id`, `PATCH /api/incidents/:id/status`, `POST /api/incidents/:id/notes`, `DELETE /api/incidents/:id` |
| Admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `PATCH /api/admin/users/:id/status`, `DELETE /api/admin/users/:id` |

## Matching Logic Summary

### Current implementation
- backend search uses MongoDB `$near` on volunteer locations
- search radius is controlled by `ALERT_RADIUS_METERS`
- volunteer browse view shows all open incidents within range
- volunteer dashboard sorts visible incidents by frontend-computed distance when live location is available

### Why that is reasonable
- MongoDB handles the expensive geo filtering close to the data
- the browser only sorts a much smaller candidate list

## Security Summary

### Implemented
- JWT-based route and socket protection
- bcrypt password hashing
- role-based authorization middleware
- validation with `express-validator`
- CORS configuration

### Still worth hardening
- tokens are stored in `localStorage`
- there is no rate limiting yet
- notification preferences are not persisted server-side
- assignment protection should be upgraded from an application-level guard to an atomic database update

## Testing & Health Summary

### Automated Testing (New)
- **Unit & Geospatial Tests**: Integrated Jest and `mongodb-memory-server` to verify the core `$near` location-matching logic.
- **Contract Tests**: Verified that volunteer notifications correctly trigger based on role and status.

### Production Readiness
- **Log Sanitization**: Sensitive environment variables and database URIs are automatically filtered from server logs.
- **Reactive Tracking**: Replaced polling-based or simulated tracking with true event-driven Socket.IO broadcasts for live volunteer movement.
- **Validation**: Enforced strict `express-validator` schemas on all data entry points.

### Missing
- End-to-end browser tests (Cypress/Playwright)
- Integration tests for high-load socket scenarios
- Performance/Load testing for large geospatial data sets

## Interview-Ready Trade-offs

| Decision | Benefit | Interview talking point |
| --- | --- | --- |
| Monolith first | Fastest way to ship the full workflow | Explain when you would split notifications, auth, and dispatch later |
| MongoDB for geo search | Strong fit for location queries | Discuss denormalization and indexing |
| Multi-channel notifications | Better delivery reliability | Discuss retries, dead-letter queues, and observability |
| JWT in SPA | Simple implementation | Discuss XSS risk and `httpOnly` cookie alternative |

## Current State In One Paragraph

Neighbours Care is a strong MVP with a clear domain story: a user reports an emergency, the backend finds nearby volunteers, the system notifies them in real time or through fallback channels, and the incident is tracked until resolution. The codebase already demonstrates meaningful backend design choices, while still leaving room for rich interview discussion around reliability, security, testing, and scale.

## Next Document

For a full interview-preparation version with architecture diagrams, API samples, data-flow walkthroughs, and model answers, read [INTERVIEW_READY_GUIDE.md](./INTERVIEW_READY_GUIDE.md).
