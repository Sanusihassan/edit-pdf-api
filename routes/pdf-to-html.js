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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupPDFToHTMLRoute = setupPDFToHTMLRoute;
const child_process_1 = require("child_process");
const util_1 = require("util");
const pdf_to_html_1 = require("../tools/pdf_to_html");
const pdf_storage_1 = require("../utils/pdf-storage");
// Promisify exec for async operations
const execPromise = (0, util_1.promisify)(child_process_1.exec);
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
    app.post('/get-pdf-data', pdf_storage_1.handlePDFUpload, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            if (!req.fileId) {
                res.status(400).json({ error: 'No PDF file uploaded' });
                return;
            }
            const fileInfo = (0, pdf_storage_1.getFile)(req.fileId);
            if (!fileInfo) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            const pdfFilePath = fileInfo.path;
            const isScanned = req.body.isScanned === 'true';
            const selectedLanguages = JSON.parse(req.body.selectedLanguages || '[]');
            // Extract PDF info using pdfinfo from poppler-utils
            const { stdout } = yield execPromise(`pdfinfo ${pdfFilePath}`);
            const pdfInfo = parsePDFInfo(stdout);
            // Add fileId to the pdfInfo for reference
            pdfInfo.fileId = req.fileId;
            // Check if page size was successfully extracted
            if (pdfInfo.pageSize.width === 0 || pdfInfo.pageSize.height === 0) {
                (0, pdf_storage_1.deleteFile)(req.fileId);
                res.status(500).json({ error: 'Could not extract page size' });
                return;
            }
            // Convert PDF to HTML
            const htmlContent = yield (0, pdf_to_html_1.PDFToHTML)(pdfFilePath, isScanned, selectedLanguages);
            // Send both HTML content and pdfinfo as a JSON response
            res.json({
                fileId: req.fileId,
                htmlContent: htmlContent,
                pdfInfo: pdfInfo
            });
            // Note: We're NOT deleting the file here anymore
            // It will be available for other routes to use
        }
        catch (error) {
            console.error('Conversion error:', error);
            res.status(500).json({
                error: 'Error processing PDF',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
            // Delete the file on error
            if (req.fileId) {
                (0, pdf_storage_1.deleteFile)(req.fileId);
            }
        }
    }));
}
