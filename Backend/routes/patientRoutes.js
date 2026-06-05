const express = require("express");
const Patient = require("../models/Patient");
const Consultation = require("../models/Consultation");
const { requireAnyRole } = require("../middleware/auth");

const router = express.Router();

async function createPatientId() {
    const totalPatients = await Patient.countDocuments();
    const nextNumber = totalPatients + 1;
    return `PAT${String(nextNumber).padStart(3, "0")}`;
}

async function createTokenNumber(campId) {
    const latestConsultation = await Consultation.findOne({ camp: campId }).sort({ tokenNumber: -1 });

    if (!latestConsultation) {
        return 1;
    }

    return latestConsultation.tokenNumber + 1;
}

router.post("/register", requireAnyRole("Patient"), async (request, response) => {
    try {
        const { age, gender, city, campId, doctorId, symptoms, previousReports, previousConsultationDetails, previousReportFile } = request.body;

        let patient = await Patient.findOne({ user: request.currentUser.id });

        if (!patient) {
            patient = await Patient.create({
                patientId: await createPatientId(),
                fullName: request.currentUser.fullName,
                email: request.currentUser.email,
                age,
                gender,
                phone: request.currentUser.contactNumber,
                city,
                user: request.currentUser.id,
            });
        } else {
            patient.fullName = request.currentUser.fullName;
            patient.email = request.currentUser.email;
            patient.phone = request.currentUser.contactNumber;
            patient.age = age;
            patient.gender = gender;
            patient.city = city;
            await patient.save();
        }

        const consultationDoc = {
            patient: patient._id,
            camp: campId,
            doctor: doctorId,
            tokenNumber: await createTokenNumber(campId),
            symptoms,
            previousReports,
            previousConsultationDetails,
        };

        if (previousReportFile && previousReportFile.data && previousReportFile.mimeType) {
            consultationDoc.previousReportFile = {
                data: previousReportFile.data,
                mimeType: previousReportFile.mimeType,
                fileName: previousReportFile.fileName || "previous-report",
            };
        }

        const consultation = await Consultation.create(consultationDoc);

        response.status(201).json({
            message: "Patient registered successfully.",
            patient,
            consultation,
        });
    } catch (error) {
        response.status(400).json({ message: "Unable to register patient.", error: error.message });
    }
});

router.get("/consultations/:id/attachment", requireAnyRole("Admin", "Doctor", "Patient"), async (request, response) => {
    try {
        const consultation = await Consultation.findById(request.params.id).populate("patient");

        if (!consultation || !consultation.previousReportFile || !consultation.previousReportFile.data) {
            return response.status(404).json({ message: "No attachment found." });
        }

        if (request.currentUser.role === "Patient") {
            const ownPatient = await Patient.findOne({ user: request.currentUser.id });
            if (!ownPatient || String(ownPatient._id) !== String(consultation.patient._id)) {
                return response.status(403).json({ message: "Not allowed." });
            }
        }

        const file = consultation.previousReportFile;
        const buffer = Buffer.from(file.data, "base64");
        response.setHeader("Content-Type", file.mimeType);
        response.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
        response.send(buffer);
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch attachment." });
    }
});

router.get("/me/history", requireAnyRole("Patient"), async (request, response) => {
    try {
        const patient = await Patient.findOne({ user: request.currentUser.id });

        if (!patient) {
            return response.json({ patient: null, consultations: [] });
        }

        const consultations = await Consultation.find({ patient: patient._id })
            .populate("camp")
            .populate("doctor")
            .sort({ registrationTime: -1 });

        response.json({ patient, consultations });
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch your history." });
    }
});

router.get("/search", requireAnyRole("Admin", "Doctor"), async (request, response) => {
    try {
        const keyword = request.query.keyword || "";
        const searchFilter = keyword
            ? {
                  $or: [
                      { patientId: new RegExp(keyword, "i") },
                      { fullName: new RegExp(keyword, "i") },
                  ],
              }
            : {};

        const patients = await Patient.find(searchFilter).sort({ createdAt: -1 });
        response.json(patients);
    } catch (error) {
        response.status(500).json({ message: "Unable to search patients." });
    }
});

router.get("/:patientId/history", requireAnyRole("Admin", "Doctor", "Patient"), async (request, response) => {
    try {
        const patient = await Patient.findOne({ patientId: request.params.patientId });

        if (!patient) {
            return response.status(404).json({ message: "Patient not found." });
        }

        if (request.currentUser.role === "Patient" && String(patient.user) !== String(request.currentUser.id)) {
            return response.status(403).json({ message: "You can view only your own history." });
        }

        const consultations = await Consultation.find({ patient: patient._id })
            .populate("camp")
            .populate("doctor")
            .sort({ registrationTime: -1 });

        response.json({ patient, consultations });
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch patient history." });
    }
});

module.exports = router;
