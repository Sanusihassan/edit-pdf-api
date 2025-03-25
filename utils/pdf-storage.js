"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCleanupTask = exports.deleteFile = exports.getFile = exports.handlePDFUpload = void 0;
// a file can stay on our registery only for 24 hours
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
// Define storage directory
const UPLOAD_DIR = '/tmp/pdf-storage';
const REGISTRY_FILE = path_1.default.join(UPLOAD_DIR, 'file-registry.json');
// Ensure the directory exists
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// Initialize or load the file registry
let fileRegistry = {};
// Load existing registry if it exists
const loadRegistry = () => {
    try {
        if (fs_1.default.existsSync(REGISTRY_FILE)) {
            const data = fs_1.default.readFileSync(REGISTRY_FILE, 'utf8');
            fileRegistry = JSON.parse(data);
            console.log(`Loaded registry with ${Object.keys(fileRegistry).length} files`);
        }
        else {
            // Create empty registry file
            saveRegistry();
            console.log('Created new empty registry file');
        }
    }
    catch (error) {
        console.error('Error loading registry:', error);
        // Create a new registry file if loading fails
        fileRegistry = {};
        saveRegistry();
    }
};
// Save registry to file
const saveRegistry = () => {
    try {
        fs_1.default.writeFileSync(REGISTRY_FILE, JSON.stringify(fileRegistry, null, 2), 'utf8');
    }
    catch (error) {
        console.error('Error saving registry:', error);
    }
};
// Load registry on startup
loadRegistry();
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const fileId = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname) || '.pdf';
        const filename = `${fileId}${extension}`;
        cb(null, filename);
    }
});
// Configure multer upload
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});
// Custom middleware to handle upload and register file
const handlePDFUpload = (req, res, next) => {
    const uploadMiddleware = upload.single('pdfFile');
    uploadMiddleware(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds 100MB limit' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        else if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (req.file) {
            const fileId = path_1.default.basename(req.file.filename, path_1.default.extname(req.file.filename));
            const userId = req.body.userId || 'anonymous';
            // Register the file in our registry
            fileRegistry[fileId] = {
                path: req.file.path,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                userId: userId,
                createdAt: new Date().toISOString()
            };
            // Save the updated registry
            saveRegistry();
            // Add fileId to the request object for easy access in route handlers
            req.fileId = fileId;
        }
        next();
    });
};
exports.handlePDFUpload = handlePDFUpload;
// Get file by ID
const getFile = (fileId) => {
    const fileInfo = fileRegistry[fileId];
    if (fileInfo) {
        // Verify that the file actually exists on disk
        if (fs_1.default.existsSync(fileInfo.path)) {
            return fileInfo;
        }
        else {
            // File doesn't exist on disk, remove from registry
            console.warn(`File ${fileId} exists in registry but not on disk, removing entry`);
            delete fileRegistry[fileId];
            saveRegistry();
            return null;
        }
    }
    return null;
};
exports.getFile = getFile;
// Delete file by ID
const deleteFile = (fileId) => {
    const fileInfo = fileRegistry[fileId];
    if (fileInfo) {
        try {
            if (fs_1.default.existsSync(fileInfo.path)) {
                fs_1.default.unlinkSync(fileInfo.path);
            }
            delete fileRegistry[fileId];
            saveRegistry();
            return true;
        }
        catch (error) {
            console.error(`Error deleting file ${fileId}:`, error);
            return false;
        }
    }
    return false;
};
exports.deleteFile = deleteFile;
// Setup a cleanup routine (optional)
// Delete files older than 1 hour
const setupCleanupTask = (intervalMs = 3600000) => {
    setInterval(() => {
        const now = new Date();
        let changed = false;
        Object.entries(fileRegistry).forEach(([fileId, fileInfo]) => {
            const fileDate = new Date(fileInfo.createdAt);
            const ageMs = now.getTime() - fileDate.getTime();
            if (ageMs > 3600000) { // 1 hour
                // Check if file exists before attempting to delete
                if (fs_1.default.existsSync(fileInfo.path)) {
                    try {
                        fs_1.default.unlinkSync(fileInfo.path);
                    }
                    catch (error) {
                        console.error(`Error deleting file ${fileId}:`, error);
                    }
                }
                delete fileRegistry[fileId];
                changed = true;
                console.log(`Cleaned up old file: ${fileId}`);
            }
        });
        if (changed) {
            saveRegistry();
        }
    }, intervalMs);
};
exports.setupCleanupTask = setupCleanupTask;
