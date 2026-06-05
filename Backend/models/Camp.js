const mongoose = require("mongoose");

const campSchema = new mongoose.Schema(
    {
        campName: {
            type: String,
            required: true,
            trim: true,
        },
        campDate: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        purpose: {
            type: String,
            required: true,
            trim: true,
        },
        assignedDoctors: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Doctor",
                },
            ],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Camp", campSchema);
