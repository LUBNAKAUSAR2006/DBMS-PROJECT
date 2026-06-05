const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: true,
        },
        camp: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Camp",
            required: true,
        },
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true,
        },
        tokenNumber: {
            type: Number,
            required: true,
        },
        symptoms: {
            type: String,
            default: "",
            trim: true,
        },
        previousReports: {
            type: String,
            default: "",
            trim: true,
        },
        previousConsultationDetails: {
            type: String,
            default: "",
            trim: true,
        },
        diagnosis: {
            type: String,
            default: "",
            trim: true,
        },
        medicines: {
            type: String,
            default: "",
            trim: true,
        },
        registrationTime: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Pending", "Consulted"],
            default: "Pending",
        },
        previousReportFile: {
            data: { type: String, default: "" },
            mimeType: { type: String, default: "" },
            fileName: { type: String, default: "" },
        },
    },
    {
        timestamps: true,
    }
);

consultationSchema.index({ registrationTime: 1 });
consultationSchema.index({ diagnosis: 1 });

module.exports = mongoose.model("Consultation", consultationSchema);
