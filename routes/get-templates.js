"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.setupGetTemplateRoute = setupGetTemplateRoute;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
// Mapping of template types to folder names
const typeToFolder = {
    "blank": "blank-page",
    "resume": "Professional-Resume",
    "meeting": "meeting-notes",
    "report": "report"
};
/**
 * Sets up a GET route to retrieve template files based on the template type, including metadata.
 * @param app - The Express application instance
 */
function setupGetTemplateRoute(app) {
    app.get("/get-template/:type", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // Extract and normalize the type parameter
            const type = req.params.type.toLowerCase();
            if (!type) {
                res.status(400).json({ error: "Missing type" });
                return;
            }
            // Map the type to the corresponding folder name
            const folderName = typeToFolder[type];
            if (!folderName) {
                res.status(400).json({ error: "Invalid template type" });
                return;
            }
            // Construct the template directory path
            const templateDir = path.join("/home/templates", folderName);
            if (!(yield fs.pathExists(templateDir))) {
                res.status(404).json({ error: "Template not found" });
                return;
            }
            // Define file paths
            const documentPath = path.join(templateDir, "document.json");
            const stylesPath = path.join(templateDir, "styles.html");
            const pageStylesPath = path.join(templateDir, "pageStyles.json");
            const thumbnailsPath = path.join(templateDir, "thumbnails.json");
            const metadataPath = path.join(templateDir, "metadata.json");
            // Read document.json
            let documentContent = null;
            if (yield fs.pathExists(documentPath)) {
                const documentData = yield fs.readFile(documentPath, "utf-8");
                documentContent = JSON.parse(documentData);
            }
            // Read styles.html (as text)
            let stylesContent = null;
            if (yield fs.pathExists(stylesPath)) {
                stylesContent = yield fs.readFile(stylesPath, "utf-8");
            }
            // Read pageStyles.json (as JSON)
            let pageStylesContent = null;
            if (yield fs.pathExists(pageStylesPath)) {
                const pageStylesData = yield fs.readFile(pageStylesPath, "utf-8");
                pageStylesContent = JSON.parse(pageStylesData);
            }
            // Read thumbnails.json
            let thumbnailsContent = null;
            if (yield fs.pathExists(thumbnailsPath)) {
                const thumbnailsData = yield fs.readFile(thumbnailsPath, "utf-8");
                thumbnailsContent = JSON.parse(thumbnailsData);
            }
            // Read metadata.json (as JSON)
            let metadataContent = null;
            if (yield fs.pathExists(metadataPath)) {
                const metadataData = yield fs.readFile(metadataPath, "utf-8");
                metadataContent = JSON.parse(metadataData);
            }
            // Send response with file contents, including metadata
            res.status(200).json({
                document: documentContent,
                styles: stylesContent,
                pageStyles: pageStylesContent,
                thumbnails: thumbnailsContent,
                metadata: metadataContent
            });
        }
        catch (error) {
            console.error("Error retrieving template files:", error);
            res.status(500).json({ error: "Error retrieving template files" });
        }
    }));
}
