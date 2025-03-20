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
    // Endpoint to save individual page data and thumbnail (unchanged)
    app.post("/save-pdf-page", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, pageId, elements, thumbnail } = req.body;
            if (!userId || !pageId || !elements || thumbnail === undefined) {
                res.status(400).json({ error: "Missing required fields" });
                return;
            }
            const tempDir = path_1.default.join("/home/pdf/temp", userId);
            yield fs_extra_1.default.mkdir(tempDir, { recursive: true });
            const elementsFilePath = path_1.default.join(tempDir, `${pageId}.json`);
            yield fs_extra_1.default.writeFile(elementsFilePath, JSON.stringify(elements));
            const thumbnailFilePath = path_1.default.join(tempDir, `${pageId}-thumbnail.json`);
            yield fs_extra_1.default.writeFile(thumbnailFilePath, JSON.stringify({ thumbnail }));
            res.status(200).json({ message: "Page data saved" });
        }
        catch (error) {
            console.error("Error saving page data:", error);
            res.status(500).json({ error: "Error saving page data" });
        }
    }));
    // Endpoint to finalize PDF and save all files
    app.post("/finalize-pdf", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, styles, metaData, pageStyles } = req.body;
            if (!userId || !styles || !metaData || !metaData.folderName || !pageStyles) {
                res.status(400).json({ error: "Missing required fields" });
                return;
            }
            const folderName = metaData.folderName;
            if (typeof folderName !== "string" ||
                folderName.length === 0 ||
                folderName.length > 255 ||
                !/^[a-zA-Z0-9_-]+$/.test(folderName)) {
                res.status(400).json({ error: "Invalid folderName" });
                return;
            }
            const tempDir = path_1.default.join("/home/pdf/temp", userId);
            const finalDir = path_1.default.join("/home/pdf", userId, folderName);
            yield fs_extra_1.default.mkdir(finalDir, { recursive: true });
            // Process page files from temp directory
            const elementFiles = (yield fs_extra_1.default.readdir(tempDir)).filter((file) => file.endsWith(".json") && !file.includes("-thumbnail"));
            const documentData = {};
            const thumbnailsData = {};
            for (const file of elementFiles) {
                const pageId = path_1.default.basename(file, ".json");
                const elementsFilePath = path_1.default.join(tempDir, file);
                const elementsData = yield fs_extra_1.default.readFile(elementsFilePath, "utf-8");
                documentData[pageId] = JSON.parse(elementsData);
                const thumbnailFilePath = path_1.default.join(tempDir, `${pageId}-thumbnail.json`);
                if (yield fs_extra_1.default.pathExists(thumbnailFilePath)) {
                    const thumbnailData = yield fs_extra_1.default.readFile(thumbnailFilePath, "utf-8");
                    const { thumbnail } = JSON.parse(thumbnailData);
                    thumbnailsData[pageId] = thumbnail;
                }
                else {
                    thumbnailsData[pageId] = null;
                }
            }
            // Save document.json
            const documentPath = path_1.default.join(finalDir, "document.json");
            yield fs_extra_1.default.writeFile(documentPath, JSON.stringify(documentData));
            // Save thumbnails.json
            const thumbnailsPath = path_1.default.join(finalDir, "thumbnails.json");
            yield fs_extra_1.default.writeFile(thumbnailsPath, JSON.stringify(thumbnailsData));
            // Save styles.html (as is, like before)
            const stylesPath = path_1.default.join(finalDir, "styles.html");
            yield fs_extra_1.default.writeFile(stylesPath, styles);
            // Save pageStyles.json (new, as JSON)
            const pageStylesPath = path_1.default.join(finalDir, "pageStyles.json");
            yield fs_extra_1.default.writeFile(pageStylesPath, JSON.stringify(pageStyles));
            // Save metadata.json
            const metadataPath = path_1.default.join(finalDir, "metadata.json");
            yield fs_extra_1.default.writeFile(metadataPath, JSON.stringify(metaData, null, 2));
            // Clean up temp directory
            yield fs_extra_1.default.rm(tempDir, { recursive: true, force: true });
            res.status(200).json({ message: "PDF data finalized successfully" });
        }
        catch (error) {
            console.error("Error finalizing PDF data:", error);
            res.status(500).json({ error: "Error finalizing PDF data" });
        }
    }));
}
