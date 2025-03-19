import { Request, Response, Express } from "express";
import fs from "fs-extra";
import path from "path";

// Assuming this is part of the same file or module as your existing code
export function setupGetPDFFilesRoute(app: Express) {
    app.get("/get-pdf-files/:userId/:folderName", async (req: Request, res: Response) => {
        try {
            // Extract parameters from the request
            const { userId, folderName } = req.params;

            // Validate inputs
            if (!userId || !folderName) {
                res.status(400).json({ error: "Missing userId or folderName" });
                return;
            }

            // Construct the directory path
            const fileDir = path.join("/home/pdf", userId, folderName);

            // Check if the directory exists
            if (!await fs.pathExists(fileDir)) {
                res.status(404).json({ error: "Files not found" });
                return;
            }

            // Define file paths
            const documentPath = path.join(fileDir, "document.json");
            const stylesPath = path.join(fileDir, "styles.html");
            const thumbnailsPath = path.join(fileDir, "thumbnails.json");

            // Read document.json
            let documentContent = null;
            if (await fs.pathExists(documentPath)) {
                const documentData = await fs.readFile(documentPath, "utf-8");
                documentContent = JSON.parse(documentData);
            }

            // Read styles.html
            let stylesContent = null;
            if (await fs.pathExists(stylesPath)) {
                stylesContent = await fs.readFile(stylesPath, "utf-8");
            }

            // Read thumbnails.json
            let thumbnailsContent = null;
            if (await fs.pathExists(thumbnailsPath)) {
                const thumbnailsData = await fs.readFile(thumbnailsPath, "utf-8");
                thumbnailsContent = JSON.parse(thumbnailsData);
            }

            // Send the response with all file contents
            res.status(200).json({
                document: documentContent,
                styles: stylesContent,
                thumbnails: thumbnailsContent
            });
        } catch (error) {
            console.error("Error retrieving PDF files:", error);
            res.status(500).json({ error: "Error retrieving PDF files" });
        }
    });
}