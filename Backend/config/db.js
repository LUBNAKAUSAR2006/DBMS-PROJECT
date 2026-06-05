const mongoose = require("mongoose");

async function connectDatabase() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.includes("PASTE_YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE")) {
        console.log("MONGODB_URI is missing. Add your MongoDB Atlas connection string in Backend/.env.");
        return;
    }

    try {
        await mongoose.connect(mongoUri);
        console.log("MongoDB Atlas connected successfully.");
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

module.exports = connectDatabase;
