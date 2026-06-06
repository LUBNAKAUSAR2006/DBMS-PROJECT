# System Architecture & Real-Time Flow

How the Smart Health Camp app actually works end-to-end — from browser click to MongoDB and back.

---

## 1. High-Level Architecture (3-tier)

```mermaid
flowchart LR
    subgraph CLIENT["BROWSER (Client)"]
        L["landing.html"]
        A["auth.html"]
        AD["admin.html"]
        R["register.html"]
        C["consultation.html"]
        RP["reports.html"]
        JS["main.js / auth.js<br/>fetch() calls"]
        CSS["style.css"]
    end

    subgraph SERVER["VERCEL SERVERLESS (Node.js + Express)"]
        APP["app.js<br/>(Express app)"]
        SESS["express-session<br/>(cookie)"]
        MW["middleware/auth.js<br/>requireLogin / requireAnyRole"]
        ROUTES["routes/*.js<br/>auth | camps | doctors |<br/>patients | consultations | reports"]
        MODELS["models/*.js<br/>Mongoose schemas"]
        DBJS["config/db.js<br/>cached connection"]
    end

    subgraph CLOUD["MONGODB ATLAS (Cloud)"]
        DB[("MongoDB<br/>5 collections")]
    end

    CLIENT -- "HTTPS<br/>fetch JSON" --> APP
    APP --> SESS --> MW --> ROUTES --> MODELS --> DBJS
    DBJS -- "TLS connection<br/>(cached)" --> DB
    DB -- "documents" --> MODELS --> ROUTES -- "JSON response" --> CLIENT
```

---

## 2. The 3 Layers in Plain Words

| Layer | What it is | Files |
|---|---|---|
| **Presentation** | HTML pages + CSS + browser JavaScript | `Frontend/views/*.html`, `Frontend/public/css/style.css`, `Frontend/public/js/*.js` |
| **Application** | Express server: routes, middleware, business rules | `Backend/app.js`, `Backend/routes/*.js`, `Backend/middleware/auth.js` |
| **Data** | MongoDB Atlas (cloud) accessed through Mongoose | `Backend/models/*.js`, `Backend/config/db.js` |

---

## 3. Request Lifecycle — what happens on every click

```mermaid
sequenceDiagram
    autonumber
    participant U as User (Browser)
    participant V as Vercel Edge
    participant E as Express (app.js)
    participant S as Session Middleware
    participant G as Auth Guard
    participant R as Route Handler
    participant M as Mongoose Model
    participant DB as MongoDB Atlas

    U->>V: HTTPS request (URL + cookie)
    V->>E: Forwards to serverless function
    E->>S: Reads session cookie
    S-->>E: req.session.user = {id, role}
    E->>G: requireLogin / requireAnyRole
    alt Not allowed
        G-->>U: 401 / 403 JSON error
    else Allowed
        G->>R: pass control
        R->>M: Model.find / create / update
        M->>DB: Query over TLS (cached connection)
        DB-->>M: Documents
        M-->>R: Plain JS objects
        R-->>U: 200 JSON / HTML / PDF
    end
```

---

## 4. Real-Time User Journeys

### 4.1 Patient registers for a camp

```mermaid
sequenceDiagram
    autonumber
    participant U as Patient (Browser)
    participant E as Express
    participant P as patientRoutes.js
    participant Pa as Patient model
    participant Co as Consultation model
    participant DB as MongoDB Atlas

    U->>E: POST /api/patients/register<br/>{age, gender, city, campId, doctorId,<br/> symptoms, previousReportFile (base64)}
    E->>P: requireAnyRole("Patient")
    P->>Pa: findOne({ user: req.user.id })
    Pa->>DB: query users link
    DB-->>Pa: existing or null
    alt First time
        P->>Pa: create({ patientId: "PAT002", ...})
        Pa->>DB: insert into patients
    end
    P->>Co: countDocuments({ camp: campId })
    Co->>DB: count for token number
    DB-->>Co: e.g. 0
    P->>Co: create({ patient, camp, doctor, tokenNumber: 1,<br/> symptoms, previousReportFile,<br/> status: "Pending" })
    Co->>DB: insert into consultations
    DB-->>P: created doc
    P-->>U: 201 JSON {patient, consultation}
    U->>U: Show card<br/>"Patient ID PAT002, Token 1, Pending"
```

### 4.2 Doctor consults patient

```mermaid
sequenceDiagram
    autonumber
    participant D as Doctor (Browser)
    participant E as Express
    participant C as consultationRoutes.js
    participant DB as MongoDB Atlas

    D->>E: GET /api/consultations/mine
    E->>C: requireAnyRole("Doctor")
    C->>DB: Consultation.find({doctor: me}).populate(patient, camp)
    DB-->>C: queue (Pending list)
    C-->>D: JSON queue → render table

    D->>E: PUT /api/consultations/:id<br/>{diagnosis, medicines}
    E->>C: requireAnyRole("Doctor")
    C->>DB: Consultation.updateOne(...,<br/> {diagnosis, medicines, status:"Consulted"})
    DB-->>C: ok
    C-->>D: 200 OK → row updates to "Consulted"
```

### 4.3 Patient downloads PDF report

```mermaid
sequenceDiagram
    autonumber
    participant U as Patient
    participant E as Express
    participant Rp as reportRoutes.js
    participant DB as MongoDB Atlas
    participant PDF as pdfkit

    U->>E: GET /api/reports/export/pdf
    E->>Rp: requireAnyRole("Admin","Patient")
    Rp->>DB: Consultation.find({patient: me})<br/>.populate(camp, doctor, patient)
    DB-->>Rp: my records
    Rp->>PDF: build "Patient Medical Report"
    PDF-->>Rp: PDF stream
    Rp-->>U: application/pdf download
```

---

## 5. Where each piece of data lives (storage map)

```mermaid
flowchart TB
    subgraph BROWSER
        F["FORM submission"]
    end

    subgraph EXPRESS
        REG["POST /api/patients/register"]
    end

    subgraph ATLAS["MongoDB Atlas Cluster"]
        U[("users")]
        P[("patients")]
        D[("doctors")]
        Ca[("camps")]
        Co[("consultations")]
    end

    F -- JSON --> REG
    REG -- "create / update" --> P
    REG -- "insert" --> Co
    Co -- "patient ref" --> P
    Co -- "camp ref" --> Ca
    Co -- "doctor ref" --> D
    P -- "user ref" --> U
    D -- "user ref" --> U
    Ca -- "assignedDoctors[]" --> D
```

---

## 6. Deployment — from your laptop to the world

```mermaid
flowchart LR
    DEV["VS Code<br/>git push"] --> GH["GitHub<br/>main branch"]
    GH -- "webhook" --> VC["Vercel build"]
    VC --> SLS["Serverless function<br/>api/index.js"]
    SLS -. "cached connection" .-> ATL[("MongoDB Atlas")]
    USR["End user (browser)"] --> SLS
    SLS --> USR
```

Steps:
1. `git push origin main` from VS Code.
2. GitHub fires a webhook to Vercel.
3. Vercel runs `npm install` and bundles `Backend/` + `Frontend/` files.
4. Vercel publishes a new serverless function at `api/index.js`.
5. Every URL is rewritten to that function via `vercel.json`.
6. The function imports `Backend/app.js`, opens (or reuses) the cached MongoDB connection, and serves the request.

---

## 7. Security & Reliability Layers (top to bottom)

| Layer | What it does |
|---|---|
| HTTPS (Vercel) | Encrypts everything in transit |
| HTTP-only session cookie | Browser cannot read it via JS |
| express-session | Server-side session store |
| bcryptjs | Passwords hashed, never plain text |
| requireLogin / requireAnyRole | Role-based access control on every API |
| Cache-Control: no-store on protected HTML | Back button cannot restore a logged-in page |
| pageshow bfcache listener | Auto-logout when browser restores from cache |
| Referential integrity check | Camps with registrations cannot be deleted |
| Mongoose schema validation | Bad data is rejected before insert |
| MongoDB Atlas Network Access | TLS + IP whitelist |

---

## 8. One-line summary to say in the demo

> "The browser sends an HTTPS request → Vercel routes it to our Express serverless function → middleware checks the session cookie and role → the matching route handler uses Mongoose to read or write documents in MongoDB Atlas over a cached TLS connection → the response goes back as JSON, HTML, CSV, or PDF. Five collections — users, patients, doctors, camps, consultations — store everything, and `consultations` is the junction that links Patient, Camp, and Doctor."
