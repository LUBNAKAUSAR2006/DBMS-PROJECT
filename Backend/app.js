const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const connectDatabase = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const campRoutes = require("./routes/campRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const consultationRoutes = require("./routes/consultationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { requireLogin, requireAnyRole } = require("./middleware/auth");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, "..", "Frontend");

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

function noStoreHtml(_request, response, next) {
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    next();
}
app.use(
    session({
        secret: process.env.SESSION_SECRET || "simple_session_secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 8,
        },
    })
);
app.use("/public", express.static(path.join(frontendPath, "public")));

app.get("/api/ping", (request, response) => {
    response.json({ ok: true, time: new Date().toISOString() });
});

app.use("/api", async (request, response, next) => {
    if (request.path === "/auth/logout" || request.path === "/auth/me") {
        return next();
    }

    if (request.path === "/auth/login" && (request.body.email || "").toLowerCase().trim() === "admin@gmail.com") {
        return next();
    }

    try {
        await connectDatabase();
        next();
    } catch (error) {
        response.status(503).json({ message: `Database connection failed: ${error.message}` });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/camps", requireLogin, campRoutes);
app.use("/api/doctors", requireLogin, doctorRoutes);
app.use("/api/patients", requireLogin, patientRoutes);
app.use("/api/consultations", requireAnyRole("Doctor"), consultationRoutes);
app.use("/api/reports", requireAnyRole("Admin", "Patient"), reportRoutes);

app.get("/", (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "landing.html"));
});

app.get("/auth", (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "auth.html"));
});

app.get("/dashboard", noStoreHtml, requireLogin, (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "index.html"));
});

app.get("/admin", noStoreHtml, requireAnyRole("Admin"), (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "admin.html"));
});

app.get("/register", noStoreHtml, requireAnyRole("Patient"), (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "register.html"));
});

app.get("/consultation", noStoreHtml, requireAnyRole("Doctor"), (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "consultation.html"));
});

app.get("/reports", noStoreHtml, requireAnyRole("Admin", "Patient"), (request, response) => {
    response.sendFile(path.join(frontendPath, "views", "reports.html"));
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = app;
