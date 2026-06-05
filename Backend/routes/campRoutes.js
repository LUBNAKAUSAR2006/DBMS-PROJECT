const express = require("express");
const Camp = require("../models/Camp");
const Consultation = require("../models/Consultation");
const { requireAnyRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAnyRole("Admin", "Patient", "Doctor"), async (request, response) => {
    try {
        const camps = await Camp.find().populate("assignedDoctors").sort({ campDate: 1 });
        response.json(camps);
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch camps." });
    }
});

router.post("/", requireAnyRole("Admin"), async (request, response) => {
    try {
        const camp = await Camp.create(request.body);
        response.status(201).json(camp);
    } catch (error) {
        response.status(400).json({ message: "Unable to create camp.", error: error.message });
    }
});

router.delete("/:id", requireAnyRole("Admin"), async (request, response) => {
    try {
        const linkedConsultations = await Consultation.countDocuments({ camp: request.params.id });

        if (linkedConsultations > 0) {
            return response.status(400).json({ message: "Camp cannot be removed because patient registrations already exist." });
        }

        await Camp.findByIdAndDelete(request.params.id);
        response.json({ message: "Camp removed successfully." });
    } catch (error) {
        response.status(400).json({ message: "Unable to remove camp.", error: error.message });
    }
});

module.exports = router;
