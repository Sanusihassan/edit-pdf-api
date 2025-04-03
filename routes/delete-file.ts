import { Request, Response, Express } from "express";
import fs from "fs-extra";
import path from "path";

// Assuming this is the structure of your file object from the frontend
interface PdfFile {
    userId: string;
    folderName: string;
    title: string;
}

export function setupDeletePDFFilesRoute(app: Express) {
    app.delete("/files", async (req: Request, res: Response) => {
        try {
            // The file object is sent in the request body via axios { data: file }
            const file: PdfFile = req.body;

            if (!file || !file.userId || !file.folderName) {
                res.status(400).json({ error: "Missing file data, userId, or folderName" });
                return;
            }

            const fileDir = path.join("/home/pdf", file.userId, file.folderName);

            // Check if the directory exists
            if (!await fs.pathExists(fileDir)) {
                res.status(404).json({ error: "File directory not found" });
                return;
            }

            // Delete the entire folder and its contents
            await fs.remove(fileDir);

            // Send success response
            res.status(200).json({
                message: "File deleted successfully",
                userId: file.userId,
                folderName: file.folderName
            });

        } catch (error) {
            console.error("Error deleting PDF files:", error);
            res.status(500).json({ error: "Error deleting PDF files" });
        }
    });
}