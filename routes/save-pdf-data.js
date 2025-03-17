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
exports.setupSavePDFDataRoute = setupSavePDFDataRoute;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function setupSavePDFDataRoute(app) {
    // Endpoint to save individual page data
    app.post('/save-pdf-page', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, pageId, elements } = req.body;
            if (!userId || !pageId || !elements) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }
            // Create a temporary directory for this user's pages
            const tempDir = path_1.default.join('/home/pdf/temp', userId);
            yield fs_extra_1.default.mkdir(tempDir, { recursive: true });
            // Save the page's elements as a JSON file
            const filePath = path_1.default.join(tempDir, `${pageId}.json`);
            yield fs_extra_1.default.writeFile(filePath, JSON.stringify(elements));
            res.status(200).json({ message: 'Page data saved' });
        }
        catch (error) {
            console.error('Error saving page data:', error);
            res.status(500).json({ error: 'Error saving page data' });
        }
    }));
    app.post('/finalize-pdf', (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // Extract userId, styles, and metaData from request body
            const { userId, styles, metaData } = req.body;
            // Validate required fields: userId and styles
            if (!userId || !styles) {
                res.status(400).json({ error: 'Missing userId or styles' });
                return;
            }
            // Validate metaData and folderName (required for directory structure)
            if (!metaData || !metaData.folderName) {
                res.status(400).json({ error: 'Missing metaData or folderName' });
                return;
            }
            const folderName = metaData.folderName;
            // Validate folderName: must be a non-empty string, max 255 chars, alphanumeric with _ or -
            if (typeof folderName !== 'string' ||
                folderName.length === 0 ||
                folderName.length > 255 ||
                !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
                res.status(400).json({ error: 'Invalid folderName' });
                return;
            }
            // Define directories
            const tempDir = path_1.default.join('/home/pdf/temp', userId);
            const finalDir = path_1.default.join('/home/pdf', userId, folderName);
            // Ensure the final directory exists (create it if it doesn’t)
            yield fs_extra_1.default.mkdir(finalDir, { recursive: true });
            // Read only .json files from the temporary directory
            const files = (yield fs_extra_1.default.readdir(tempDir)).filter(file => file.endsWith('.json'));
            // Combine all page data into one object
            const elementsByPageId = {};
            for (const file of files) {
                const pageId = path_1.default.basename(file, '.json');
                const filePath = path_1.default.join(tempDir, file);
                const data = yield fs_extra_1.default.readFile(filePath, 'utf-8');
                elementsByPageId[pageId] = JSON.parse(data);
            }
            // Save document.json, overwriting any existing file
            const documentPath = path_1.default.join(finalDir, 'document.json');
            yield fs_extra_1.default.writeFile(documentPath, JSON.stringify(elementsByPageId));
            // Save styles.html, overwriting any existing file
            const stylesPath = path_1.default.join(finalDir, 'styles.html');
            yield fs_extra_1.default.writeFile(stylesPath, styles);
            // Save metadata.json (since metaData is required), overwriting any existing file
            const metadataPath = path_1.default.join(finalDir, 'metadata.json');
            yield fs_extra_1.default.writeFile(metadataPath, JSON.stringify(metaData, null, 2));
            // Clean up the temporary directory
            yield fs_extra_1.default.rm(tempDir, { recursive: true, force: true });
            // Send success response
            res.status(200).json({
                message: 'PDF data finalized successfully',
            });
        }
        catch (error) {
            console.error('Error finalizing PDF data:', error);
            res.status(500).json({
                error: 'Error finalizing PDF data',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }));
}
