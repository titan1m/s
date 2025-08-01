import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import crypto from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { promisify } from "util";
import zlib from "zlib";
import sharp from "sharp";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(bodyParser.json());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connect & Start Server
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log("✅ MongoDB Connected");
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
})
.catch(err => console.error("❌ MongoDB Error:", err));

// Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});

const DataProcessSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    operationType: String, // compression, encryption, etc.
    inputFile: String,
    outputFile: String,
    settings: Object, // algorithm used, keys, etc.
    timestamp: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model("User", UserSchema, "users");
const DataProcess = mongoose.model("DataProcess", DataProcessSchema, "data_processes");

// Utility functions
const pipeline = promisify(require('stream').pipeline);

// Routes

// Serve HTML pages
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/compression", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "compression.html"));
});

app.get("/encryption", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "encryption.html"));
});

app.get("/decryption", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "decryption.html"));
});

app.get("/hashing", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "hashing.html"));
});

app.get("/steganography", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "steganography.html"));
});

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await User.findOne({ username });

        if (exists) return res.status(400).json({ message: "⚠ User already exists" });

        const user = new User({ username, password });
        await user.save();
        res.status(201).json({ message: "✅ Registered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Server error during signup" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });

        if (!user) return res.status(401).json({ message: "❌ Invalid credentials" });

        res.status(200).json({ message: "✅ Login successful", userId: user._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Server error during login" });
    }
});

// Data Processing Routes
app.post("/api/compress", upload.single('file'), async (req, res) => {
    try {
        const { algorithm } = req.body;
        const inputPath = req.file.path;
        const outputPath = `${inputPath}.compressed`;
        
        // Simple compression example (in a real app, you'd use proper compression)
        await pipeline(
            createReadStream(inputPath),
            zlib.createGzip(),
            createWriteStream(outputPath)
        );

        res.status(200).json({ 
            message: "✅ Compression successful",
            downloadLink: `/download?file=${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Compression failed" });
    }
});

app.post("/api/encrypt", upload.single('file'), async (req, res) => {
    try {
        const { algorithm, key } = req.body;
        const inputPath = req.file.path;
        const outputPath = `${inputPath}.encrypted`;
        
        // Simple encryption example (in a real app, use proper crypto)
        const cipher = crypto.createCipher(algorithm, key);
        await pipeline(
            createReadStream(inputPath),
            cipher,
            createWriteStream(outputPath)
        );

        res.status(200).json({ 
            message: "✅ Encryption successful",
            downloadLink: `/download?file=${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Encryption failed" });
    }
});

app.post("/api/decrypt", upload.single('file'), async (req, res) => {
    try {
        const { algorithm, key } = req.body;
        const inputPath = req.file.path;
        const outputPath = `${inputPath}.decrypted`;
        
        // Simple decryption example
        const decipher = crypto.createDecipher(algorithm, key);
        await pipeline(
            createReadStream(inputPath),
            decipher,
            createWriteStream(outputPath)
        );

        res.status(200).json({ 
            message: "✅ Decryption successful",
            downloadLink: `/download?file=${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Decryption failed" });
    }
});

app.post("/api/hash", async (req, res) => {
    try {
        const { text, algorithm } = req.body;
        const hash = crypto.createHash(algorithm).update(text).digest('hex');
        
        res.status(200).json({ 
            message: "✅ Hash generated",
            hash
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Hashing failed" });
    }
});

app.post("/api/steganography", upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'secret', maxCount: 1 }
]), async (req, res) => {
    try {
        const { method } = req.body;
        const coverPath = req.files.cover[0].path;
        const secretPath = req.files.secret[0].path;
        const outputPath = `${coverPath}.steg`;
        
        // Simple steganography example (would be more complex in real app)
        await sharp(coverPath)
            .composite([{ input: secretPath, blend: 'over' }])
            .toFile(outputPath);

        res.status(200).json({ 
            message: "✅ Steganography successful",
            downloadLink: `/download?file=${path.basename(outputPath)}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "❌ Steganography failed" });
    }
});

// File download route
app.get("/download", (req, res) => {
    const file = req.query.file;
    const filePath = path.join(__dirname, 'uploads', file);
    
    res.download(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("❌ File download failed");
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('❌ Something broke!');
});
