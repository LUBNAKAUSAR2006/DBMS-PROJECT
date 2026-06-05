const express = require("express");
const PDFDocument = require("pdfkit");
const Consultation = require("../models/Consultation");
const Patient = require("../models/Patient");
const { requireAnyRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAnyRole("Admin", "Patient"));

async function getCurrentPatient(request) {
    if (request.currentUser.role !== "Patient") {
        return null;
    }

    return Patient.findOne({ user: request.currentUser.id });
}

async function buildSummary(request) {
    if (request.currentUser.role === "Patient") {
        const patient = await getCurrentPatient(request);

        if (!patient) {
            return {
                totalPatients: 1,
                totalRegistrations: 0,
                genderCount: [],
                ageGroups: [],
                diseaseTrends: [],
                dailyRegistrations: [],
            };
        }

        const totalRegistrations = await Consultation.countDocuments({ patient: patient._id });
        const diseaseTrends = await Consultation.aggregate([
            {
                $match: {
                    patient: patient._id,
                    diagnosis: { $ne: "" },
                },
            },
            {
                $group: {
                    _id: "$diagnosis",
                    total: { $sum: 1 },
                },
            },
            {
                $sort: { total: -1 },
            },
        ]);

        return {
            totalPatients: 1,
            totalRegistrations,
            genderCount: [{ _id: patient.gender, total: 1 }],
            ageGroups: [{ _id: patient.age <= 18 ? "Below 18" : patient.age <= 40 ? "18-40" : patient.age <= 60 ? "41-60" : "Above 60", total: 1 }],
            diseaseTrends,
            dailyRegistrations: [],
        };
    }

    const totalPatients = await Patient.countDocuments();
    const totalRegistrations = await Consultation.countDocuments();

    const genderCount = await Patient.aggregate([
        {
            $group: {
                _id: "$gender",
                total: { $sum: 1 },
            },
        },
    ]);

    const ageGroups = await Patient.aggregate([
        {
            $project: {
                group: {
                    $switch: {
                        branches: [
                            { case: { $lt: ["$age", 18] }, then: "Below 18" },
                            { case: { $and: [{ $gte: ["$age", 18] }, { $lte: ["$age", 40] }] }, then: "18-40" },
                            { case: { $and: [{ $gte: ["$age", 41] }, { $lte: ["$age", 60] }] }, then: "41-60" },
                        ],
                        default: "Above 60",
                    },
                },
            },
        },
        {
            $group: {
                _id: "$group",
                total: { $sum: 1 },
            },
        },
    ]);

    const diseaseTrends = await Consultation.aggregate([
        {
            $match: {
                diagnosis: { $ne: "" },
            },
        },
        {
            $group: {
                _id: "$diagnosis",
                total: { $sum: 1 },
            },
        },
        {
            $sort: { total: -1 },
        },
    ]);

    const dailyRegistrations = await Consultation.aggregate([
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$registrationTime" },
                },
                total: { $sum: 1 },
            },
        },
        {
            $sort: { _id: 1 },
        },
    ]);

    return {
        totalPatients,
        totalRegistrations,
        genderCount,
        ageGroups,
        diseaseTrends,
        dailyRegistrations,
    };
}

async function buildRegistrations(request) {
    const filters = request.query;
    const query = {};

    if (request.currentUser.role === "Patient") {
        const patient = await getCurrentPatient(request);

        if (!patient) {
            return [];
        }

        query.patient = patient._id;
    }

    if (filters.doctorId) {
        query.doctor = filters.doctorId;
    }

    if (filters.date) {
        const startDate = new Date(`${filters.date}T00:00:00`);
        const endDate = new Date(`${filters.date}T23:59:59`);
        query.registrationTime = { $gte: startDate, $lte: endDate };
    }

    if (filters.disease) {
        query.diagnosis = new RegExp(filters.disease, "i");
    }

    const registrations = await Consultation.find(query)
        .populate("patient")
        .populate("doctor")
        .populate("camp")
        .sort({ registrationTime: -1 });

    return registrations.filter((item) => {
        if (!filters.keyword) {
            return true;
        }

        const keyword = filters.keyword.toLowerCase();
        return (
            item.patient.fullName.toLowerCase().includes(keyword) ||
            item.patient.patientId.toLowerCase().includes(keyword)
        );
    });
}

router.get("/summary", async (request, response) => {
    try {
        const summary = await buildSummary(request);
        response.json(summary);
    } catch (error) {
        response.status(500).json({ message: "Unable to build summary report." });
    }
});

router.get("/registrations", async (request, response) => {
    try {
        const registrations = await buildRegistrations(request);
        response.json(registrations);
    } catch (error) {
        response.status(500).json({ message: "Unable to fetch registrations." });
    }
});

router.get("/export/csv", async (request, response) => {
    try {
        const registrations = await buildRegistrations(request);
        const headers = [
            "Patient ID",
            "Patient Name",
            "Age",
            "Gender",
            "Contact",
            "City",
            "Camp",
            "Camp Date",
            "Camp Location",
            "Doctor",
            "Specialization",
            "Token",
            "Symptoms",
            "Previous Details",
            "Diagnosis",
            "Prescribed Medicines",
            "Status",
            "Registered On",
        ];
        const rows = [headers.join(",")];

        registrations.forEach((item) => {
            rows.push(
                [
                    item.patient.patientId,
                    item.patient.fullName,
                    item.patient.age || "",
                    item.patient.gender || "",
                    item.patient.phone || "",
                    item.patient.city || "",
                    item.camp.campName,
                    item.camp.campDate ? String(item.camp.campDate).slice(0, 10) : "",
                    item.camp.location || "",
                    item.doctor.doctorName,
                    item.doctor.specialization || "",
                    item.tokenNumber,
                    item.symptoms || "",
                    item.previousConsultationDetails || item.previousReports || "",
                    item.diagnosis || "Pending",
                    item.medicines || "Pending",
                    item.status,
                    new Date(item.registrationTime).toLocaleString(),
                ]
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(",")
            );
        });

        response.setHeader("Content-Type", "text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=healthcamp-report.csv");
        response.send(rows.join("\n"));
    } catch (error) {
        response.status(500).json({ message: "Unable to export CSV report." });
    }
});

router.get("/export/pdf", async (request, response) => {
    try {
        const summary = await buildSummary(request);
        const registrations = await buildRegistrations(request);
        const document = new PDFDocument();

        response.setHeader("Content-Type", "application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=healthcamp-report.pdf");

        document.pipe(response);
        document.fontSize(18).text(request.currentUser.role === "Admin" ? "Health Camp Report" : "Patient Medical Report", { underline: true });
        document.moveDown();
        document.fontSize(12).text(`Total Patients: ${summary.totalPatients}`);
        document.text(`Total Registrations: ${summary.totalRegistrations}`);
        document.moveDown();
        document.text("Gender Count:");

        summary.genderCount.forEach((item) => {
            document.text(`${item._id}: ${item.total}`);
        });

        document.moveDown();
        document.text("Disease Trends:");

        summary.diseaseTrends.forEach((item) => {
            document.text(`${item._id}: ${item.total}`);
        });

        document.moveDown();
        document.text("Consultation Records:");

        registrations.forEach((item) => {
            document.moveDown(0.5);
            document.font("Helvetica-Bold").text(`${item.camp.campName} (${item.camp.campDate ? String(item.camp.campDate).slice(0, 10) : ""})`);
            document.font("Helvetica")
                .text(`Patient: ${item.patient.fullName} (${item.patient.patientId})`)
                .text(`Doctor: ${item.doctor.doctorName} - ${item.doctor.specialization || ""}`)
                .text(`Token: ${item.tokenNumber} | Status: ${item.status}`)
                .text(`Symptoms: ${item.symptoms || "Not provided"}`)
                .text(`Previous Details: ${item.previousConsultationDetails || item.previousReports || "None"}`)
                .text(`Diagnosis: ${item.diagnosis || "Pending"}`)
                .text(`Prescribed Medicines: ${item.medicines || "Pending"}`)
                .text(`Registered On: ${new Date(item.registrationTime).toLocaleString()}`);
        });

        document.end();
    } catch (error) {
        response.status(500).json({ message: "Unable to export PDF report." });
    }
});

module.exports = router;
