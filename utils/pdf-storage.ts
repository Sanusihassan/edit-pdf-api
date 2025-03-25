// a file can stay on our registery only for 24 hours
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Define storage directory
const UPLOAD_DIR = '/tmp/pdf-storage';
const REGISTRY_FILE = path.join(UPLOAD_DIR, 'file-registry.json');

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// File registry type definition
interface FileInfo {
    path: string;
    originalName: string;
    mimetype: string;
    userId: string;
    createdAt: string; // Store as ISO string for JSON compatibility
}

interface FileRegistry {
    [fileId: string]: FileInfo;
}

// Initialize or load the file registry
let fileRegistry: FileRegistry = {};

// Load existing registry if it exists
const loadRegistry = (): void => {
    try {
        if (fs.existsSync(REGISTRY_FILE)) {
            const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
            fileRegistry = JSON.parse(data);
            console.log(`Loaded registry with ${Object.keys(fileRegistry).length} files`);
        } else {
            // Create empty registry file
            saveRegistry();
            console.log('Created new empty registry file');
        }
    } catch (error) {
        console.error('Error loading registry:', error);
        // Create a new registry file if loading fails
        fileRegistry = {};
        saveRegistry();
    }
};

// Save registry to file
const saveRegistry = (): void => {
    try {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(fileRegistry, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving registry:', error);
    }
};

// Load registry on startup
loadRegistry();

// Configure multer storage
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        const extension = path.extname(file.originalname) || '.pdf';
        const filename = `${fileId}${extension}`;
        cb(null, filename);
    }
});

// Configure multer upload
const upload = multer({
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
const handlePDFUpload = (req: any, res: any, next: Function) => {
    const uploadMiddleware = upload.single('pdfFile');

    uploadMiddleware(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds 100MB limit' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (req.file) {
            const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
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

// Get file by ID
const getFile = (fileId: string) => {
    const fileInfo = fileRegistry[fileId];

    if (fileInfo) {
        // Verify that the file actually exists on disk
        if (fs.existsSync(fileInfo.path)) {
            return fileInfo;
        } else {
            // File doesn't exist on disk, remove from registry
            console.warn(`File ${fileId} exists in registry but not on disk, removing entry`);
            delete fileRegistry[fileId];
            saveRegistry();
            return null;
        }
    }

    return null;
};

// Delete file by ID
const deleteFile = (fileId: string) => {
    const fileInfo = fileRegistry[fileId];
    if (fileInfo) {
        try {
            if (fs.existsSync(fileInfo.path)) {
                fs.unlinkSync(fileInfo.path);
            }
            delete fileRegistry[fileId];
            saveRegistry();
            return true;
        } catch (error) {
            console.error(`Error deleting file ${fileId}:`, error);
            return false;
        }
    }
    return false;
};

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
                if (fs.existsSync(fileInfo.path)) {
                    try {
                        fs.unlinkSync(fileInfo.path);
                    } catch (error) {
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

export {
    handlePDFUpload,
    getFile,
    deleteFile,
    setupCleanupTask
};