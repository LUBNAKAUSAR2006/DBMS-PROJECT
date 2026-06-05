const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
    {
        doctorName: {
            type: String,
            required: true,
            trim: true,
        },
        doctorEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        doctorPhone: {
            type: String,
            required: true,
            trim: true,
        },
        specialization: {
            type: String,
            required: true,
            trim: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

doctorSchema.index({ doctorEmail: 1 });
doctorSchema.index({ doctorPhone: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);
