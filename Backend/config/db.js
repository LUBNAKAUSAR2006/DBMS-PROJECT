const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

let connectionPromise = null;

async function connectDatabase() {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.includes("PASTE_YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE")) {
        throw new Error("MONGODB_URI is missing. Add it in Vercel Environment Variables.");
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
