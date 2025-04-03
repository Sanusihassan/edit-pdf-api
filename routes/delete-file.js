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
exports.setupDeletePDFFilesRoute = setupDeletePDFFilesRoute;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function setupDeletePDFFilesRoute(app) {
    app.delete("/files", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            // The file object is sent in the request body via axios { data: file }
            const file = req.body;
            if (!file || !file.userId || !file.folderName) {
                res.status(400).json({ error: "Missing file data, userId, or folderName" });
                return;
            }
            const fileDir = path_1.default.join("/home/pdf", file.userId, file.folderName);
            // Check if the directory exists
            if (!(yield fs_extra_1.default.pathExists(fileDir))) {
                res.status(404).json({ error: "File directory not found" });
                return;
            }
            // Delete the entire folder and its contents
            yield fs_extra_1.default.remove(fileDir);
            // Send success response
            res.status(200).json({
                message: "File deleted successfully",
                userId: file.userId,
                folderName: file.folderName
            });
        }
        catch (error) {
            console.error("Error deleting PDF files:", error);
            res.status(500).json({ error: "Error deleting PDF files" });
        }
    }));
}
