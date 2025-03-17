"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uid = void 0;
exports.setupPDFToHTMLRoute = setupPDFToHTMLRoute;
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const pdf_to_html_1 = require("../tools/pdf_to_html");
const uuid_1 = require("uuid");
// Promisify exec for async operations
const execPromise = (0, util_1.promisify)(child_process_1.exec);
// Generate a unique ID
exports.uid = (0, uuid_1.v4)();
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: '/tmp/',
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
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
// Custom error handler for multer
const handleMulterUpload = (req, res, next) => {
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
        next();
    });
};
// Function to parse pdfinfo output into a structured object
function parsePDFInfo(stdout) {
    const lines = stdout.split('\n');
    const pdfInfo = { pageSize: { width: 0, height: 0 } };
    for (const line of lines) {
        const [key, value] = line.split(':').map(part => part.trim());
        if (!key || !value)
            continue;
        switch (key) {
            case 'Title':
                pdfInfo.title = value;
                break;
            case 'Producer':
                pdfInfo.producer = value;
                break;
            case 'Tagged':
                pdfInfo.tagged = value;
                break;
            case 'UserProperties':
                pdfInfo.userProperties = value;
                break;
            case 'Suspects':
                pdfInfo.suspects = value;
                break;
            case 'Form':
                pdfInfo.form = value;
                break;
            case 'JavaScript':
                pdfInfo.javaScript = value;
                break;
            case 'Pages':
                pdfInfo.pages = parseInt(value, 10);
                break;
            case 'Encrypted':
                pdfInfo.encrypted = value;
                break;
            case 'Page size':
                const sizeMatch = value.match(/([\d.]+) x ([\d.]+) pts(?: \(([^)]+)\))?/);
                if (sizeMatch) {
                    pdfInfo.pageSize = {
                        width: parseFloat(sizeMatch[1]),
                        height: parseFloat(sizeMatch[2]),
                        sizeType: sizeMatch[3] // e.g., "letter" or undefined if not present
                    };
                }
                break;
            case 'Page rot':
                pdfInfo.pageRot = parseInt(value, 10);
                break;
            case 'File size':
                pdfInfo.fileSize = value;
                break;
            case 'Optimized':
                pdfInfo.optimized = value;
                break;
            case 'PDF version':
                pdfInfo.pdfVersion = value;
                break;
        }
    }
    return pdfInfo;
}
// Route handler function
function setupPDFToHTMLRoute(app) {
    app.post('/get-pdf-data', handleMulterUpload, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No PDF file uploaded' });
                return;
            }
            const pdfFilePath = req.file.path;
            const userId = req.body.userId || exports.uid; // Extract userId from form data
            const isScanned = req.body.isScanned === 'true'; // Extract isScanned from form data
            const selectedLanguages = JSON.parse(req.body.selectedLanguages);
            // Extract PDF info using pdfinfo from poppler-utils
            const { stdout } = yield execPromise(`pdfinfo ${pdfFilePath}`);
            const pdfInfo = parsePDFInfo(stdout);
            // Check if page size was successfully extracted
            if (pdfInfo.pageSize.width === 0 || pdfInfo.pageSize.height === 0) {
                fs_1.default.unlinkSync(pdfFilePath);
                res.status(500).json({ error: 'Could not extract page size' });
                return;
            }
            // Convert PDF to HTML
            const htmlContent = yield (0, pdf_to_html_1.PDFToHTML)(pdfFilePath, isScanned, selectedLanguages);
            // Send both HTML content and pdfinfo as a JSON response
            res.json({
                htmlContent: htmlContent,
                pdfInfo: pdfInfo
            });
            // Clean up the uploaded file
            fs_1.default.unlink(pdfFilePath, (err) => {
                if (err)
                    console.error('Error deleting temporary file:', err);
            });
        }
        catch (error) {
            console.error('Conversion error:', error);
            res.status(500).json({
                error: 'Error processing PDF',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            // Ensure file is deleted on error
            if (req.file && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
        }
    }));
}
