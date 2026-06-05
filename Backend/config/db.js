const mongoose = require("mongoose");

let connectionPromise = null;

async function connectDatabase() {
    if (connectionPromise) {
        return connectionPromise;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.includes("PASTE_YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE")) {
        console.log("MONGODB_URI is missing. Add your MongoDB Atlas connection string in Backend/.env or Vercel env vars.");
        return null;
    }

    connectionPromise = mongoose
        .connect(mongoUri, { serverSelectionTimeoutMS: 8000 })
        .then((connection) => {
            console.log("MongoDB Atlas connected successfully.");
            return connection;
        })
        .catch((error) => {
            console.error("Database connection failed:", error.message);
            connectionPromise = null;
            throw error;
        });

    return connectionPromise;
}

module.exports = connectDatabase;
