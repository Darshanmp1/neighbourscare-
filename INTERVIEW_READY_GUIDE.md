# Neighbours Care: Interview-Ready Project Guide

## 1. 🚀 Project Overview

### Problem statement
- In a neighborhood emergency, the biggest gap is often the first 5 to 15 minutes.
- A person in distress may need help before police, ambulance, or fire services arrive.
- Nearby volunteers are physically close enough to help, but there is no lightweight coordination system.

### Solution provided by Neighbours Care
- Neighbours Care is a community emergency response platform.
- A user reports an incident from the browser with title, description, priority, and coordinates.
- The backend finds nearby volunteers using MongoDB geospatial search.
- The system sends alerts through Socket.IO, email, and SMS depending on volunteer availability.
- The incident moves through a simple lifecycle: `open -> in_progress -> resolved`.

### Target users
- `User`: reports emergencies and tracks help.
- `Volunteer`: receives alerts, shares live location, accepts incidents, and resolves them.
- `Admin`: manages incidents and users inside a community.

### Example scenario
- A resident sees a fire in an apartment corridor.
- They tap the `FIRE` quick action.
- The frontend fetches GPS coordinates and sends the report.
- The backend stores the incident, reverse-geocodes the area, and searches for nearby active volunteers within `ALERT_RADIUS_METERS`.
- Online volunteers get a socket alert instantly.
- Offline volunteers get email, and volunteers with phones may also get SMS.
- One volunteer accepts the incident and navigates with Google Maps.
- The reporter sees the status change from `open` to `in_progress`, then to `resolved`.

---

## 2. ⭐ Key Features

### User features
- one-click emergency presets for `fire`, `robbery`, `assault`, and `ambulance`
- manual incident reporting with title, description, priority, and live coordinates
- incident history with status badges and timestamps
- map-based incident visualization
- assigned volunteer contact visibility when a volunteer accepts

### System features
- JWT-based authentication for API and socket connections
- role-based dashboards for `user`, `volunteer`, and `admin`
- MongoDB `2dsphere` indexing for location-based volunteer search
- fallback notification pipeline: socket first, then email and SMS
- community-scoped admin and volunteer visibility
- response-time tracking using `responseTime`, `resolvedAt`, and Mongoose virtuals

### Unique aspects
- combines **radius-based matching** with **community-based scoping**
- uses `lastSeen` to infer online vs offline volunteers
- supports multi-channel notification escalation based on urgency
- keeps the incident flow simple enough for an MVP, but rich enough for system-design discussion

---

## 3. 🧠 Tech Stack (With Justification Table)

| Layer | Technology | Why Used | Alternatives |
| --- | --- | --- | --- |
| Frontend UI | React 19 + Vite | Fast SPA development, component reuse, simple role-based dashboards | Next.js, Angular, Vue |
| Styling | Tailwind CSS | Quick utility-based styling for dashboard-heavy UI | Bootstrap, Material UI, CSS Modules |
| Routing | React Router | Simple client-side role routing | TanStack Router, Next.js App Router |
| HTTP client | Axios | Easy interceptors for JWT injection and centralized error handling | Fetch API, React Query + fetch |
| Maps | Leaflet + React Leaflet | Lightweight interactive maps with marker control | Google Maps SDK, Mapbox |
| Realtime | Socket.IO | Easy room-based events and auth-aware live updates | Native WebSocket, SSE |
| Backend API | Node.js + Express | Simple, readable REST API and middleware model | NestJS, Fastify, Spring Boot |
| Database | MongoDB + Mongoose | Natural fit for GeoJSON, `2dsphere` indexes, flexible incident documents | PostgreSQL + PostGIS, MySQL |
| Auth | JWT + bcryptjs | Stateless auth and secure password hashing | Session auth, Passport, OAuth |
| Validation | express-validator | Request-level validation close to route logic | Joi, Zod |
| Notifications | Nodemailer + Twilio | Practical email and SMS channels for offline responders | SendGrid, AWS SES, MessageBird |
| Geocoding | OpenStreetMap Nominatim via Axios | Free reverse-geocoding for address and community derivation | Google Maps Geocoding API, Mapbox Geocoding |

### Good interview justification
- MongoDB was chosen mainly because geospatial querying is a first-class requirement.
- Express was chosen because the project benefits more from delivery speed and readability than heavy framework abstraction.
- Socket.IO is justified because connection management, auth, and events are easier than implementing WebSocket plumbing manually.

---

## 4. 🏗️ System Architecture (Detailed)

### Architecture type
- **3-tier modular monolith**
- Frontend SPA
- REST API backend
- MongoDB data layer
- event-driven realtime extension through Socket.IO

### Why this architecture was chosen
- It keeps the MVP easy to ship and demo.
- One service can own authentication, incident management, sockets, and notifications.
- It is simpler to explain in interviews than premature microservices.
- It still exposes real backend concerns: geo-search, concurrency, authorization, fallbacks, and external integrations.

### Layer-by-layer breakdown

#### 1. Presentation layer
- React app with separate dashboards per role
- Browser geolocation for users and volunteers
- Axios for REST calls
- Socket.IO client for live events
- Leaflet maps for incidents and volunteer positioning

#### 2. Application layer
- Express routes for `auth`, `incidents`, and `admin`
- middleware for `protect` and `authorize`
- business logic for incident creation, volunteer discovery, and incident status transitions
- notification orchestration across socket, email, and SMS

#### 3. Data and integration layer
- MongoDB stores `users` and `incidents`
- Mongoose models define schema, indexes, and helper methods
- Nominatim derives `address` and `community`
- SMTP and Twilio handle offline notifications

### Simple architecture diagram

```text
                         +---------------------------+
                         |   User / Volunteer /      |
                         |          Admin            |
                         +-------------+-------------+
                                       |
                                       v
                         +---------------------------+
                         | React + Vite Frontend     |
                         | Axios + Socket.IO Client  |
                         | Leaflet Map UI            |
                         +-------------+-------------+
                                       |
                    +------------------+------------------+
                    | HTTP REST                           | WebSocket
                    v                                     v
         +---------------------------+         +---------------------------+
         | Express Routes            |         | Socket.IO Server          |
         | /auth /incidents /admin   |         | authenticated user rooms  |
         +-------------+-------------+         +-------------+-------------+
                       |                                     |
                       +------------------+------------------+
                                          |
                                          v
                         +---------------------------+
                         | Service / Model Layer     |
                         | Auth, Matching, Notify    |
                         +-------------+-------------+
                                       |
               +-----------------------+------------------------+
               |                        |                       |
               v                        v                       v
   +---------------------+  +----------------------+  +----------------------+
   | MongoDB             |  | Nominatim Geocoder   |  | SMTP / Twilio        |
   | Users, Incidents    |  | address + community  |  | email + SMS alerts   |
   +---------------------+  +----------------------+  +----------------------+
```

### Important architectural note
- This is a monolith in deployment, but the code is already separated into route, model, middleware, service, and utility boundaries.
- That makes future extraction into services easier.

---

## 5. 🔄 Data Flow (Critical Section)

### A. User Registration / Login

#### Registration flow
```text
User -> Frontend Register Form -> POST /api/auth/register
-> express-validator -> optional reverse geocoding
-> User model pre-save password hashing
-> MongoDB users collection
-> JWT generation
-> Frontend stores token in localStorage
-> Socket connects with token
```

#### Step-by-step
1. User enters name, email, password, role, optional location, and phone.
2. Backend validates the payload.
3. If coordinates exist, backend calls the geocoder and derives `community`.
4. If role is `admin`, backend checks whether an admin already exists for that community.
5. Password is hashed in the Mongoose pre-save hook.
6. User is stored in MongoDB.
7. JWT is returned and saved on the frontend.
8. Frontend later calls `GET /api/auth/me` to load the user profile.

#### Login flow
```text
User -> Frontend Login Form -> POST /api/auth/login
-> find user by email -> compare password
-> update lastSeen -> generate JWT
-> Frontend stores token -> load profile -> connect socket
```

### B. Posting a Request

```text
User -> Quick Action / Manual Form -> Browser Geolocation
-> POST /api/incidents -> validation
-> reverse geocoding for address/community
-> Incident saved in MongoDB
-> backend queries nearby volunteers
-> notifications sent
-> API response returns incident + notifiedCount
```

#### Step-by-step
1. User chooses either a quick action or manual report.
2. Frontend captures `lat` and `lng` from the browser.
3. Backend validates title, description, coordinates, priority, and address length.
4. Backend reverse-geocodes the coordinates into an `address` and `community`.
5. Incident is stored with status `open`.
6. Backend performs a geo query for nearby active volunteers.
7. Volunteers are split into online and offline groups based on `lastSeen`.
8. Socket alerts go to online volunteers.
9. Email goes to offline volunteers.
10. SMS goes to offline volunteers with phone numbers, and also to online volunteers for `high` or `critical` incidents.

### C. Matching Neighbors

```text
Incident Location -> MongoDB 2dsphere index -> $near query
-> active volunteers within radius
-> classify online/offline by lastSeen
-> notify in priority order
```

#### Matching rules
- volunteer must have `role = volunteer`
- volunteer must have `isActive = true`
- volunteer must be within `ALERT_RADIUS_METERS`
- online status is approximated by `lastSeen > now - 5 minutes`
- volunteer browse view is also filtered by `community`

### D. Notification Flow

```text
Incident Created
-> online volunteer? yes -> Socket.IO room event
-> offline volunteer? yes -> Email notification
-> phone available? yes -> SMS notification
-> priority high/critical? yes -> also SMS online volunteers
```

### E. Incident Status Update Flow

```text
Volunteer -> PATCH /api/incidents/:id/status
-> Incident model updateStatus()
-> set assignedVolunteer and responseTime
-> save to MongoDB
-> emit incident:statusUpdate to reporter room
-> broadcast incident:statusUpdate to other clients
```

### Important interview note
- The current implementation has the right control flow.
- For a production version, I would strengthen assignment with an **atomic conditional update** rather than a model-level guard alone.

---

## 6. 🗄️ Database Design

### Collections
- `users`
- `incidents`

### Entity relationship summary

```text
User (reporter) 1 ------ N Incident
User (volunteer) 0..1 -- N Incident.assignedVolunteer
Incident 1 ----------- N Notes (embedded)
Incident 1 ----------- N NotifiedVolunteers (embedded)
```

### User collection

| Field | Type | Purpose |
| --- | --- | --- |
| `name` | String | display name |
| `email` | String, unique | login identity |
| `password` | String | hashed credential |
| `role` | Enum | `user`, `volunteer`, `admin` |
| `location` | GeoJSON Point | geo-search and volunteer tracking |
| `phone` | String | SMS fallback |
| `address` | String | human-readable address |
| `autoLocationUpdate` | Boolean | future location preference |
| `isActive` | Boolean | admin-enabled availability |
| `lastSeen` | Date | online/offline heuristic |
| `community` | String | admin scope and volunteer filtering |

### Incident collection

| Field | Type | Purpose |
| --- | --- | --- |
| `reporter` | ObjectId -> User | who created the incident |
| `title` | String | short incident label |
| `description` | String | incident details |
| `status` | Enum | `open`, `in_progress`, `resolved` |
| `priority` | Enum | `low`, `medium`, `high`, `critical` |
| `location` | GeoJSON Point | geo matching |
| `address` | String | human-readable location |
| `assignedVolunteer` | ObjectId -> User | responder |
| `responseTime` | Date | when someone accepted |
| `resolvedAt` | Date | when incident was closed |
| `notes[]` | Embedded docs | incident-local updates |
| `notifiedVolunteers[]` | Embedded docs | audit trail for notification delivery |
| `community` | String | fast filtering for admin/volunteer views |

### Example schema

```json
{
  "reporter": "664f5b9d...",
  "title": "Fire Emergency",
  "description": "Smoke coming from the second floor corridor.",
  "status": "open",
  "priority": "critical",
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "address": "Indiranagar, Bengaluru, Karnataka, India",
  "assignedVolunteer": null,
  "community": "Indiranagar, Bengaluru",
  "notifiedVolunteers": [
    {
      "user": "6650a33c...",
      "method": "socket",
      "notifiedAt": "2026-03-26T10:00:00.000Z"
    }
  ]
}
```

### Relationships
- one user can report many incidents
- one volunteer can be assigned to many incidents over time
- admin scope is not a separate table; it is derived from the shared `community` string

### Indexing strategy

| Collection | Index | Why |
| --- | --- | --- |
| `users` | `location: 2dsphere` | nearby volunteer search |
| `users` | `email: 1` | login lookup |
| `users` | `role: 1` | role filtering |
| `users` | `isActive: 1` | only active volunteers |
| `users` | `lastSeen: -1` | availability heuristics |
| `incidents` | `location: 2dsphere` | map and geo operations |
| `incidents` | `status: 1` | dashboard filtering |
| `incidents` | `reporter: 1` | user-specific incident list |
| `incidents` | `assignedVolunteer: 1` | volunteer incident list |
| `incidents` | `createdAt: -1` | recent-first views |
| `incidents` | `community: 1` | community scoping |

### Normalization decisions
- `reporter` and `assignedVolunteer` are references because users are shared entities.
- `notes` and `notifiedVolunteers` are embedded because they are tightly coupled to one incident.
- `community` is intentionally denormalized onto both users and incidents to make admin and volunteer queries cheaper.

### Interview-worthy trade-off
- Denormalization speeds reads and simplifies filters.
- The downside is consistency risk if community calculation rules change later.

---

## 7. 🧩 Core Modules

### Authentication
**What it does**
- registers users
- logs users in
- returns JWTs
- protects REST and socket connections

**Why it exists**
- different roles need different dashboards and permissions
- volunteers and admins must not see unauthorized data

**Current design**
- JWT generated on login/register
- `protect` middleware validates tokens
- `authorize` middleware gates role-specific routes
- separate socket authentication middleware validates tokens for realtime channels

**Trade-off**
- simple and stateless
- but storing JWT in `localStorage` is more vulnerable to XSS than `httpOnly` cookies

### Request Management
**What it does**
- creates incidents
- lists incidents based on role
- retrieves a single incident
- adds notes
- deletes incidents

**Why it exists**
- incident lifecycle is the center of the product
- all other modules orbit around incident creation and resolution

**Current design**
- users see only their own incidents
- volunteers see open incidents in their community plus their assigned incidents
- admins see incidents in their community

### Matching Logic
**What it does**
- finds nearby volunteers
- checks activity and role
- decides who gets socket vs email vs SMS

**Why it exists**
- sending every alert to every volunteer would be noisy and expensive
- proximity improves relevance and response time

**Current design**
- MongoDB `$near` query on volunteer coordinates
- `ALERT_RADIUS_METERS` controls radius
- `lastSeen` approximates online presence

### Notification System
**What it does**
- pushes realtime incident alerts
- sends email fallback
- sends SMS fallback or escalation for urgent incidents

**Why it exists**
- realtime alone is not enough if the volunteer is offline

**Current design**
- socket event for online volunteers
- email for offline volunteers
- SMS for offline volunteers with phones
- extra SMS for online volunteers when priority is `high` or `critical`

### Admin Control
**What it does**
- community-scoped user management
- role changes
- active/inactive toggles
- incident deletion

**Why it exists**
- communities need local moderation, not global unrestricted admin access

**Current design**
- admin routes are protected globally by `protect` + `authorize('admin')`
- same-community checks prevent cross-community user management
- one admin per community is enforced during registration and promotion

### Important reality to remember
- the Settings screen exists, but notification preference persistence is not wired to backend storage yet
- in interviews, present this as a deliberate MVP boundary, not as a hidden feature

---

## 8. ⚙️ Algorithms & Logic

### 1. Volunteer matching algorithm

#### Inputs
- incident coordinates
- volunteer coordinates
- activity state
- optional phone and contact channels

#### Logic
1. Store the incident.
2. Query active volunteers near the incident using MongoDB geospatial search.
3. Split volunteers into online and offline groups using `lastSeen`.
4. Notify online volunteers by socket.
5. Notify offline volunteers by email.
6. Send SMS where available.
7. If priority is `high` or `critical`, send SMS to online volunteers too.

#### Why this design
- geo filtering happens close to the data
- notification channel is chosen pragmatically, not uniformly
- urgency changes notification intensity

### 2. Frontend distance ranking

#### Logic
- volunteer dashboard calculates Haversine distance from the volunteer's current location to each visible incident
- if location is available, incidents are sorted by nearest first
- otherwise, incidents fall back to recent-first ordering

#### Time complexity
- distance computation for `m` incidents: `O(m)`
- sorting incidents by distance: `O(m log m)`

### 3. Online/offline heuristic

#### Current rule
- volunteer is treated as online if `lastSeen` is within the last 5 minutes

#### Why used
- it is cheap and easy to compute
- avoids needing a dedicated presence service for the MVP

#### Trade-off
- `lastSeen` is a heuristic, not true presence
- multi-instance deployments would need shared presence state

### 4. Incident assignment logic

#### Current intent
- prevent multiple volunteers from taking the same incident

#### Current implementation
- model method throws a `ConcurrencyError` if an already-assigned `in_progress` incident is accepted by another volunteer

#### Important trade-off
- this is a good first-layer guard
- but it is not the strongest possible guarantee under high concurrency

#### Stronger production alternative
- use `findOneAndUpdate` with a condition like:

```js
{ _id: incidentId, status: 'open', assignedVolunteer: { $exists: false } }
```

- this makes assignment atomic at the database level

### 5. Optimization logic
- geospatial indexes avoid full-table scans
- denormalized `community` reduces query complexity for admin and volunteer dashboards
- notification logs are stored inside the incident to keep an audit trail near the write path
- response and resolution timestamps are stored once and exposed as virtual minutes for analytics

---

## 9. 🌐 API Design (Interview Important)

### Endpoint list

| Method | Endpoint | Auth | Purpose | Common Status Codes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | create account | `201`, `400`, `500` |
| `POST` | `/api/auth/login` | Public | authenticate user | `200`, `400`, `401`, `500` |
| `GET` | `/api/auth/me` | Private | get current user | `200`, `401`, `500` |
| `PUT` | `/api/auth/location` | Private | update user coordinates | `200`, `400`, `401`, `500` |
| `PUT` | `/api/auth/profile` | Private | update profile fields | `200`, `400`, `401`, `500` |
| `PUT` | `/api/auth/password` | Private | change password | `200`, `400`, `401`, `500` |
| `POST` | `/api/incidents` | Private | create incident | `201`, `400`, `401`, `500` |
| `GET` | `/api/incidents` | Private | list incidents by role | `200`, `401`, `500` |
| `GET` | `/api/incidents/:id` | Private | get one incident | `200`, `403`, `404`, `500` |
| `PATCH` | `/api/incidents/:id/status` | Volunteer/Admin | accept or resolve incident | `200`, `400`, `404`, `409`, `500` |
| `POST` | `/api/incidents/:id/notes` | Private | add incident note | `200`, `400`, `404`, `500` |
| `DELETE` | `/api/incidents/:id` | Admin | remove incident | `200`, `400`, `404`, `500` |
| `GET` | `/api/admin/users` | Admin | list users in admin community | `200`, `403`, `500` |
| `PATCH` | `/api/admin/users/:id/role` | Admin | update role | `200`, `400`, `403`, `404`, `500` |
| `PATCH` | `/api/admin/users/:id/status` | Admin | activate/deactivate user | `200`, `403`, `404`, `500` |
| `DELETE` | `/api/admin/users/:id` | Admin | delete user | `200`, `400`, `403`, `404`, `500` |

### Sample request: register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "password123",
  "role": "volunteer",
  "phone": "+919876543210",
  "lat": 12.9716,
  "lng": 77.5946
}
```

### Sample response: register

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "664f5b9d...",
    "name": "Asha Rao",
    "email": "asha@example.com",
    "role": "volunteer",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "community": "Indiranagar, Bengaluru"
  }
}
```

### Sample request: create incident

```http
POST /api/incidents
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "Fire Emergency",
  "description": "Smoke coming from the second floor corridor.",
  "priority": "critical",
  "lat": 12.9716,
  "lng": 77.5946
}
```

### Sample response: create incident

```json
{
  "success": true,
  "message": "Incident created successfully",
  "incident": {
    "_id": "66508c0e...",
    "reporter": "664f5b9d...",
    "title": "Fire Emergency",
    "description": "Smoke coming from the second floor corridor.",
    "status": "open",
    "priority": "critical",
    "address": "Indiranagar, Bengaluru, Karnataka, India",
    "community": "Indiranagar, Bengaluru",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  },
  "notifiedCount": {
    "socket": 2,
    "email": 1,
    "sms": 3
  }
}
```

### Sample request: accept incident

```http
PATCH /api/incidents/66508c0e.../status
Authorization: Bearer <volunteer-token>
Content-Type: application/json
```

```json
{
  "status": "in_progress"
}
```

### Sample response: accept incident

```json
{
  "success": true,
  "message": "Incident status updated successfully",
  "incident": {
    "_id": "66508c0e...",
    "status": "in_progress",
    "assignedVolunteer": "6650a33c...",
    "responseTime": "2026-03-26T10:02:00.000Z"
  }
}
```

### Socket events

| Event | Producer | Consumer | Purpose |
| --- | --- | --- | --- |
| `incident:new` | backend | volunteers/admin | announce new nearby incident |
| `incident:statusUpdate` | backend | reporter + other clients | keep dashboards in sync |
| `incident:noteAdded` | backend | reporter | share updates |
| `volunteer:location` | frontend volunteer client | backend | send live volunteer coordinates |

### API design strengths
- clear route grouping by domain
- role-based access at route level
- responses include `success` and `message`, which makes UI handling easier

### API design improvements I would discuss in interviews
- use shared request/response schemas to avoid frontend-backend contract drift
- add idempotency for incident creation and notification retries
- standardize pagination and filtering for large datasets

---

## 10. ⚠️ Challenges & Solutions

| Problem | Solution | Learning |
| --- | --- | --- |
| Match nearby volunteers without scanning all users | Stored volunteer location as GeoJSON and added `2dsphere` index | Data modeling should reflect query patterns early |
| Keep admin access local to one neighborhood | Derived and stored `community` from reverse-geocoding | Denormalization can be valuable when it matches product boundaries |
| Reach volunteers whether online or offline | Used Socket.IO first, then email/SMS fallback | Reliability often requires channel redundancy |
| Avoid two volunteers taking the same incident | Added a model-level concurrency guard and return `409` on conflict | Good first step, but database-level atomic updates are stronger |
| Show meaningful volunteer ordering | Sort incidents on the frontend by computed Haversine distance | Push heavy filtering to DB, keep light ranking in UI |
| Build analytics quickly | Computed dashboard stats from fetched incidents | For MVPs, client-side aggregation is acceptable before building a reporting pipeline |
| Support community-specific admins | Enforced one admin per community at registration and promotion | Business rules belong in backend validation, not only in UI |

### Best interview insight here
- The project shows that solving the business problem is not enough.
- You also need to think about **query design**, **authorization boundaries**, **notification reliability**, and **race conditions**.

---

## 11. 📈 Scalability & System Design Thinking

### How I would scale to 10k users
- keep the monolith, but deploy multiple backend instances
- move MongoDB to Atlas with proper indexes
- add a Redis adapter for Socket.IO so rooms work across instances
- introduce rate limiting and request logging
- add background jobs for email/SMS instead of doing them inline during incident creation

### How I would scale to 100k users
- split notification sending into an async queue-driven worker
- cache common reads like admin summaries
- add pagination for users and incidents
- introduce read replicas and, later, sharding by geography or community
- maintain presence state in Redis instead of relying only on `lastSeen`
- create a search/indexing strategy for large incident histories

### Caching ideas
- Redis cache for admin summary stats
- cache recent incidents per community
- short-lived cache for geocoder responses to avoid repeated reverse lookups

### Load balancing
- put backend instances behind a load balancer
- enable sticky sessions if needed for WebSocket upgrades
- if using Socket.IO across nodes, back it with Redis pub/sub

### Database scaling
- keep `2dsphere` indexes healthy
- archive old resolved incidents to cold storage
- partition incident reads by `community` and time window
- if moving to SQL later, consider PostGIS for stronger relational guarantees plus geo support

### Monolith -> Microservices transition

#### Step 1: extract Notifications
- move email and SMS into a worker service
- API publishes an "incident_created" event to a queue
- notification service handles retries and delivery logs

#### Step 2: extract Incident Dispatch
- isolate incident lifecycle, assignment, and status rules
- gives clearer ownership for the most business-critical domain

#### Step 3: extract Auth / Identity
- only if multiple clients or organizations require more advanced identity flows

#### Step 4: add Analytics pipeline
- stream incident lifecycle events into a reporting store

### Strong interview answer
- I would not jump to microservices on day one.
- I would first fix reliability bottlenecks inside the monolith, then extract the highest-churn or highest-latency modules, starting with notifications.

---

## 12. 🔐 Security Design

### Authentication and authorization

#### Implemented now
- JWT authentication for API routes
- socket authentication using the same token
- role-based authorization middleware
- password hashing with bcrypt

#### Why this is appropriate
- lightweight for a SPA
- easy to reason about in development
- enough for controlled MVP usage

### Data protection

#### Implemented now
- password field is excluded from default queries
- input validation via `express-validator`
- CORS is configurable
- environment variables hold secrets

#### Still needed for production
- move JWT from `localStorage` to `httpOnly` cookies
- add `helmet`
- add audit logging for admin actions
- encrypt or mask sensitive operational logs

### Abuse prevention

#### Current state
- authorization checks exist
- same-community restrictions exist for admin operations

#### Gaps to call out honestly
- no rate limiting on login or incident creation
- no account lockout policy
- no abuse detection for fake incidents or repeated alerts
- no phone/email verification workflow

### Security trade-offs

| Area | Current choice | Benefit | Better long-term option |
| --- | --- | --- | --- |
| Token storage | `localStorage` | simple SPA setup | `httpOnly` cookie + CSRF strategy |
| Incident assignment | model-level guard | fast to implement | atomic DB update with optimistic locking |
| Notification delivery | inline request path | simpler flow | queue with retries and dead-letter handling |
| Admin boundary | `community` string checks | easy to enforce | stronger organization/tenant model |

---

## 13. 🧪 Testing Strategy

### Current state of the repo
- there is **no formal automated test framework configured**
- there are manual verification scripts in `backend/` for quick actions, admin features, community scoping, and Twilio-related checks

### Unit tests I would add first
- `User.comparePassword()`
- `Incident.updateStatus()`
- `Incident.addNote()`
- distance calculation utility
- geocoder response parsing
- auth middleware token parsing

### Integration tests I would add next
- register -> login -> get profile
- create incident -> verify notified volunteer audit entries
- volunteer accepts incident -> second volunteer receives `409`
- admin can only manage users in same community
- one admin per community rule

### Realtime contract tests
- `incident:new` payload shape
- `incident:statusUpdate` payload shape
- socket auth rejection on invalid token

### End-to-end flows
- user quick action creates incident
- volunteer sees incident and accepts it
- reporter sees status transition
- admin exports CSV and changes a user role

### Important edge cases
- incident created with missing location
- volunteer without phone number
- geocoder failure
- SMS provider unavailable
- two volunteers click accept at nearly the same time
- user moves communities after registration
- admin tries to delete their own account

### Best interview phrasing
- "For the MVP I used manual verification scripts to validate the highest-risk flows quickly. For production, I would formalize those same flows into unit, integration, realtime contract, and end-to-end tests."

---

## 14. 🎯 Interview Questions & Answers (Most Important)

### 🟢 Basic

**Q: What is this project?**  
It is a neighborhood emergency coordination platform. A user can report an emergency with location, the backend finds nearby volunteers using geospatial search, and the system coordinates the response through realtime updates, email, and SMS.

**Q: Why did you build it?**  
I wanted to solve a real local problem instead of building a generic CRUD app. In emergencies, nearby people can often help faster than formal responders, so I designed a system that turns location and availability into actionable local response.

**Q: What are the main roles in the system?**  
There are three. Users report incidents, volunteers respond to them, and admins manage incidents and users inside a specific community. That separation helped me design both the UI and the authorization layer more clearly.

### 🟡 Intermediate

**Q: Explain the architecture.**  
I built it as a modular monolith. The frontend is a React SPA, the backend is Express, MongoDB stores users and incidents, and Socket.IO handles live updates. I kept it monolithic because it let me ship the full workflow quickly, but I still separated concerns into routes, middleware, models, services, and utilities so the codebase stays maintainable and can evolve later.

**Q: How does the incident flow work end to end?**  
The user creates an incident from the frontend, usually with browser geolocation. The backend validates the data, reverse-geocodes the location into an address and community, stores the incident, then runs a geospatial query to find nearby active volunteers. Online volunteers get socket alerts, offline ones get email and sometimes SMS. When a volunteer accepts the incident, the backend records the response time, assigns that volunteer, and pushes status updates back to the reporter and other clients.

**Q: How does matching work?**  
The main matching happens in MongoDB using a `2dsphere` index and a `$near` query. That gives me volunteers inside a configurable radius. After that, I apply lightweight business rules like `isActive`, role, and online/offline classification using `lastSeen`. On the volunteer dashboard, I sort the already-filtered incident list by Haversine distance if live location is available.

**Q: Why did you store community as a string?**  
Because community is a business boundary in this app, especially for admins and volunteer browsing. Storing it directly on both users and incidents makes those queries cheap and simple. The trade-off is denormalization, so if the derivation logic changes later, I would need a migration or a more explicit tenant model.

### 🔴 Advanced

**Q: How would you scale this to a much larger user base?**  
First, I would keep the monolith but move notification sending into background jobs so incident creation stays fast. Then I would add Redis for Socket.IO scaling, cache admin summaries, paginate large lists, and improve presence tracking beyond `lastSeen`. Only after the hotspots are clear would I extract notifications and incident dispatch into separate services.

**Q: Why this tech stack instead of, say, PostgreSQL and microservices?**  
The key requirement was fast delivery of a geo-aware MVP. MongoDB made geospatial data very natural, Express kept the backend lightweight, and Socket.IO made realtime messaging easy to add. PostgreSQL with PostGIS would also be a strong choice, especially if I needed stronger relational guarantees, but for this version MongoDB was the faster path to a working product.

**Q: What is the weakest technical area in the current implementation?**  
The biggest one is incident assignment concurrency. I do have a guard that returns `409` if an incident is already assigned, but the strongest production design would use an atomic conditional update in the database. I would also formalize socket payload contracts, because realtime systems become fragile when frontend and backend event shapes drift.

**Q: What would you change if this became production-critical?**  
I would improve four things first: atomic assignment, queue-based notifications, stronger auth storage with `httpOnly` cookies, and an automated test suite. After that I would add observability, rate limiting, and a more explicit presence model for volunteers.

**Q: Why is this a good backend interview project?**  
Because it is not just CRUD. It includes geospatial data, role-based auth, realtime updates, external integrations, operational trade-offs, and a clear product story. That gives me room to talk about both implementation and system design.

---

## 15. 🗣️ Elevator Pitch

### 30-second version
Neighbours Care is a community emergency response platform where residents can report incidents with location, nearby volunteers are matched through MongoDB geospatial search, and alerts are delivered through sockets, email, and SMS. It demonstrates full-stack ownership across frontend, backend, realtime systems, auth, and database design.

### 60-second version
Neighbours Care solves a real local problem: how to get help from nearby people before formal responders arrive. I built it as a React frontend and an Express backend with MongoDB. Users create incidents from their current location, the backend reverse-geocodes the area, stores the incident, and finds nearby volunteers using a `2dsphere` index. Online volunteers receive socket alerts, offline ones get email or SMS, and the incident is tracked from open to resolved. I also added community-scoped admin controls, live volunteer location sharing, and response-time metrics. It is a good interview project because it combines product thinking with practical backend trade-offs like geo-search, authorization, concurrency, and scalability.

---

## 16. ⚡ Quick Revision Cheat Sheet

### Tech stack
- Frontend: React, Vite, Axios, React Router, Leaflet
- Backend: Node.js, Express, Socket.IO
- DB: MongoDB + Mongoose
- Auth: JWT + bcryptjs
- Notifications: Nodemailer + Twilio
- Geo: OpenStreetMap Nominatim

### Key flows
- Register/Login -> JWT -> `/auth/me` -> socket connect
- Create incident -> geocode -> save -> geo-search volunteers -> notify
- Accept incident -> assign volunteer -> set `responseTime` -> broadcast update
- Resolve incident -> set `resolvedAt`

### Important database points
- `users` and `incidents` are the main collections
- location stored as GeoJSON `Point`
- `community` is denormalized for fast filtering
- notes and notification logs are embedded inside incidents

### Must-remember backend keywords
- `2dsphere index`
- `$near query`
- `JWT middleware`
- `role-based authorization`
- `Socket.IO rooms`
- `fallback notifications`
- `community scoping`
- `responseTimeMinutes virtual`

### Must-remember trade-offs
- monolith for speed, microservices later
- MongoDB for geo convenience, PostGIS is a valid alternative
- `localStorage` JWT is simple but weaker than cookies
- current concurrency guard is good MVP logic, but atomic DB updates are stronger

### Strong one-liners for interviews
- "I modeled the data around the most important query: find active volunteers near an incident."
- "I used denormalized community data to make authorization and filtering cheap."
- "I chose a monolith intentionally because the hardest part at this stage was product completeness, not service decomposition."
- "The first production hardening step would be atomic assignment plus queue-based notifications."

### Final memory hook
- **Problem:** local emergencies need faster first response
- **Core feature:** geo-matched volunteer dispatch
- **Best technical angle:** realtime + geospatial + role-based backend
- **Best improvement angle:** concurrency, queues, security, tests
