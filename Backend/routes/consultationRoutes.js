const express = require("express");
const Consultation = require("../models/Consultation");

const router = express.Router();

router.get("/mine", async (request, response) => {
    try {
        const filter = {};

        if (!request.currentUser.doctorId) {
            return response.status(400).json({ message: "Doctor account is not linked to a doctor profile." });
        }

        filter.doctor = request.currentUser.doctorId;

        const consultations = await Consultation.find(filter)
            .populate("patient")
            .populate("camp")
            .populate("doctor")
            .sort({ registrationTime: -1, tokenNumber: 1 });

        response.json(consultations);
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch consultations." });
    }
});

router.put("/:id", async (request, response) => {
    try {
        if (!request.currentUser.doctorId) {
            return response.status(400).json({ message: "Doctor account is not linked to a doctor profile." });
        }

        const consultation = await Consultation.findOneAndUpdate(
            {
                _id: request.params.id,
                doctor: request.currentUser.doctorId,
            },
            {
                symptoms: request.body.symptoms,
                previousReports: request.body.previousReports,
                previousConsultationDetails: request.body.previousConsultationDetails,
                diagnosis: request.body.diagnosis,
                medicines: request.body.medicines,
                status: "Consulted",
            },
            {
                new: true,
            }
        )
            .populate("patient")
            .populate("camp")
            .populate("doctor");

        if (!consultation) {
            return response.status(404).json({ message: "Consultation not found." });
        }

        response.json(consultation);
    } catch (error) {
        response.status(400).json({ message: "Unable to update consultation.", error: error.message });
    }
});

module.exports = router;
