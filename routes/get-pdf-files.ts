import { Request, Response, Express } from "express";
import fs from "fs-extra";
import path from "path";

export function setupGetPDFFilesRoute(app: Express) {
    app.get("/get-pdf-files/:userId/:folderName", async (req: Request, res: Response) => {
        try {
            const { userId, folderName } = req.params;
            if (!userId || !folderName) {
                res.status(400).json({ error: "Missing userId or folderName" });
                return;
            }

            const fileDir = path.join("/home/pdf", userId, folderName);
            if (!await fs.pathExists(fileDir)) {
                res.status(404).json({ error: "Files not found" });
                return;
            }

            const documentPath = path.join(fileDir, "document.json");
            const stylesPath = path.join(fileDir, "styles.html");
            const pageStylesPath = path.join(fileDir, "pageStyles.json");
            const thumbnailsPath = path.join(fileDir, "thumbnails.json");

            // Read document.json
            let documentContent = null;
            if (await fs.pathExists(documentPath)) {
                const documentData = await fs.readFile(documentPath, "utf-8");
                documentContent = JSON.parse(documentData);
            }

            // Read styles.html (as text)
            let stylesContent = null;
            if (await fs.pathExists(stylesPath)) {
                stylesContent = await fs.readFile(stylesPath, "utf-8");
            }

            // Read pageStyles.json (as JSON)
            let pageStylesContent = null;
            if (await fs.pathExists(pageStylesPath)) {
                const pageStylesData = await fs.readFile(pageStylesPath, "utf-8");
                pageStylesContent = JSON.parse(pageStylesData);
            }

            // Read thumbnails.json
            let thumbnailsContent = null;
            if (await fs.pathExists(thumbnailsPath)) {
                const thumbnailsData = await fs.readFile(thumbnailsPath, "utf-8");
                thumbnailsContent = JSON.parse(thumbnailsData);
            }

            // Send response
            res.status(200).json({
                document: documentContent,
                styles: stylesContent,      // HTML string
                pageStyles: pageStylesContent, // JSON object
                thumbnails: thumbnailsContent
            });
        } catch (error) {
            console.error("Error retrieving PDF files:", error);
            res.status(500).json({ error: "Error retrieving PDF files" });
        }
    });
}