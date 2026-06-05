const express = require("express");
const Doctor = require("../models/Doctor");
const Camp = require("../models/Camp");
const { requireAnyRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAnyRole("Admin", "Patient", "Doctor"), async (request, response) => {
    try {
        if (request.currentUser.role === "Doctor") {
            if (!request.currentUser.doctorId) {
                return response.json([]);
            }

            const doctor = await Doctor.findById(request.currentUser.doctorId).sort({ doctorName: 1 });
            return response.json(doctor ? [doctor] : []);
        }

        if (request.query.campId) {
            const camp = await Camp.findById(request.query.campId);

            if (!camp) {
                return response.json([]);
            }

            const doctors = await Doctor.find({ _id: { $in: camp.assignedDoctors } }).sort({ doctorName: 1 });
            return response.json(doctors);
        }

        const doctors = await Doctor.find().sort({ doctorName: 1 });
        response.json(doctors);
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch doctors." });
    }
});

module.exports = router;
