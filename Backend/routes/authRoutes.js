const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Doctor = require("../models/Doctor");

const router = express.Router();

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "Admin@123";

function getRedirectPath(role) {
    if (role === "Admin") {
        return "/admin";
    }

    if (role === "Patient") {
        return "/register";
    }

    return "/consultation";
}

function buildSessionUser(user) {
    return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
        doctorId: user.doctorId || null,
    };
}

router.get("/me", (request, response) => {
    response.json({ user: request.session.user || null });
});

router.post("/register", async (request, response) => {
    try {
        const { fullName, email, contactNumber, specialization, password, confirmPassword, role } = request.body;

        if (!fullName || !email || !contactNumber || !password || !confirmPassword || !role) {
            return response.status(400).json({ message: "All required fields must be filled." });
        }

        if (!["Patient", "Doctor"].includes(role)) {
            return response.status(400).json({ message: "Invalid role selected." });
        }

        if (role === "Doctor" && !specialization) {
            return response.status(400).json({ message: "Doctor specialization is required." });
        }

        if (password !== confirmPassword) {
            return response.status(400).json({ message: "Password and confirm password must match." });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const normalizedContactNumber = String(contactNumber).trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return response.status(400).json({ message: "An account with this email already exists." });
        }

        let doctorId = null;
        let user = null;

        const hashedPassword = await bcrypt.hash(password, 10);

        if (role === "Doctor") {
            const existingDoctor = await Doctor.findOne({
                $or: [{ doctorEmail: normalizedEmail }, { doctorPhone: normalizedContactNumber }],
            });

            if (existingDoctor) {
                return response.status(400).json({
                    message: "Doctor with this email or contact number already exists.",
                });
            }

            user = await User.create({
                fullName,
                email: normalizedEmail,
                contactNumber: normalizedContactNumber,
                password: hashedPassword,
                role,
                doctorId: null,
            });

            const doctorRecord = await Doctor.create({
                doctorName: fullName,
                doctorEmail: normalizedEmail,
                doctorPhone: normalizedContactNumber,
                specialization,
                user: user._id,
            });

            doctorId = doctorRecord._id;
            user.doctorId = doctorId;
            await user.save();
        } else {
            user = await User.create({
                fullName,
                email: normalizedEmail,
                contactNumber: normalizedContactNumber,
                password: hashedPassword,
                role,
                doctorId: null,
            });
        }

        response.status(201).json({
            message: "Registration successful. Please login to continue.",
            redirectPath: `/auth?mode=login&role=${role}`,
        });
    } catch (error) {
        response.status(400).json({ message: "Unable to register user.", error: error.message });
    }
});

router.post("/login", async (request, response) => {
    try {
        const { email, password } = request.body;

        const normalizedEmail = String(email || "").toLowerCase().trim();

        if (normalizedEmail === ADMIN_EMAIL) {
            if (password !== ADMIN_PASSWORD) {
                return response.status(401).json({ message: "Invalid email or password." });
            }

            request.session.user = {
                id: "admin-fixed-user",
                fullName: "Administrator",
                email: ADMIN_EMAIL,
                contactNumber: "",
                role: "Admin",
                doctorId: null,
            };

            return response.json({
                message: "Login successful.",
                redirectPath: "/admin",
                user: request.session.user,
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return response.status(401).json({ message: "Invalid email or password." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
            return response.status(401).json({ message: "Invalid email or password." });
        }

        request.session.user = buildSessionUser(user);

        response.json({
            message: "Login successful.",
            redirectPath: getRedirectPath(user.role),
            user: request.session.user,
        });
    } catch (error) {
        response.status(500).json({ message: "Unable to log in." });
    }
});

router.post("/logout", (request, response) => {
    request.session.destroy(() => {
        response.json({ message: "Logged out successfully." });
    });
});

module.exports = router;
