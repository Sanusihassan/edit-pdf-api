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
exports.setupGetPDFFilesRoute = setupGetPDFFilesRoute;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function setupGetPDFFilesRoute(app) {
    app.get("/get-pdf-files/:userId/:folderName", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const { userId, folderName } = req.params;
            if (!userId || !folderName) {
                res.status(400).json({ error: "Missing userId or folderName" });
                return;
            }
            const fileDir = path_1.default.join("/home/pdf", userId, folderName);
            if (!(yield fs_extra_1.default.pathExists(fileDir))) {
                res.status(404).json({ error: "Files not found" });
                return;
            }
            const documentPath = path_1.default.join(fileDir, "document.json");
            const stylesPath = path_1.default.join(fileDir, "styles.html");
            const pageStylesPath = path_1.default.join(fileDir, "pageStyles.json");
            const thumbnailsPath = path_1.default.join(fileDir, "thumbnails.json");
            // Read document.json
            let documentContent = null;
            if (yield fs_extra_1.default.pathExists(documentPath)) {
                const documentData = yield fs_extra_1.default.readFile(documentPath, "utf-8");
                documentContent = JSON.parse(documentData);
            }
            // Read styles.html (as text)
            let stylesContent = null;
            if (yield fs_extra_1.default.pathExists(stylesPath)) {
                stylesContent = yield fs_extra_1.default.readFile(stylesPath, "utf-8");
            }
            // Read pageStyles.json (as JSON)
            let pageStylesContent = null;
            if (yield fs_extra_1.default.pathExists(pageStylesPath)) {
                const pageStylesData = yield fs_extra_1.default.readFile(pageStylesPath, "utf-8");
                pageStylesContent = JSON.parse(pageStylesData);
            }
            // Read thumbnails.json
            let thumbnailsContent = null;
            if (yield fs_extra_1.default.pathExists(thumbnailsPath)) {
                const thumbnailsData = yield fs_extra_1.default.readFile(thumbnailsPath, "utf-8");
                thumbnailsContent = JSON.parse(thumbnailsData);
            }
            // Send response
            res.status(200).json({
                document: documentContent,
                styles: stylesContent, // HTML string
                pageStyles: pageStylesContent, // JSON object
                thumbnails: thumbnailsContent
            });
        }
        catch (error) {
            console.error("Error retrieving PDF files:", error);
            res.status(500).json({ error: "Error retrieving PDF files" });
        }
    }));
    app.get("/files", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // Extract userId from query parameters
            const { userId } = req.query;
            if (!userId || typeof userId !== "string") {
                res.status(400).json({ error: "Missing or invalid userId" });
                return;
            }
            // Construct the path to the user's directory
            const userDir = path_1.default.join("/home/pdf", userId);
            // Check if the user's directory exists
            if (!(yield fs_extra_1.default.pathExists(userDir))) {
                res.status(404).json({ error: "User directory not found" });
                return;
            }
            // Read all folders in the user's directory
            const folders = yield fs_extra_1.default.readdir(userDir, { withFileTypes: true });
            const metadataList = [];
            // Iterate over each folder
            for (const folder of folders) {
                if (folder.isDirectory()) {
                    const folderName = folder.name;
                    const metadataPath = path_1.default.join(userDir, folderName, "metadata.json");
                    // Check if metadata.json exists in the folder
                    if (yield fs_extra_1.default.pathExists(metadataPath)) {
                        const metadataData = yield fs_extra_1.default.readFile(metadataPath, "utf-8");
                        const metadata = JSON.parse(metadataData);
                        metadataList.push({ folderName, metadata });
                    }
                }
            }
            // Send the collected metadata as a JSON response
            res.status(200).json(metadataList);
        }
        catch (error) {
            console.error("Error retrieving files:", error);
            res.status(500).json({ error: "Error retrieving files" });
        }
    }));
}
