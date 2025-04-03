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
    app.get("/files", async (req: Request, res: Response) => {
        try {
            // Extract userId from query parameters
            const { userId } = req.query;
            if (!userId || typeof userId !== "string") {
                res.status(400).json({ error: "Missing or invalid userId" });
                return;
            }

            // Construct the path to the user's directory
            const userDir = path.join("/home/pdf", userId);

            // Check if the user's directory exists
            if (!await fs.pathExists(userDir)) {
                res.status(404).json({ error: "User directory not found" });
                return;
            }

            // Read all folders in the user's directory
            const folders = await fs.readdir(userDir, { withFileTypes: true });
            const metadataList = [];

            // Iterate over each folder
            for (const folder of folders) {
                if (folder.isDirectory()) {
                    const folderName = folder.name;
                    const metadataPath = path.join(userDir, folderName, "metadata.json");

                    // Check if metadata.json exists in the folder
                    if (await fs.pathExists(metadataPath)) {
                        const metadataData = await fs.readFile(metadataPath, "utf-8");
                        const metadata = JSON.parse(metadataData);
                        metadataList.push({ folderName, metadata });
                    }
                }
            }

            // Send the collected metadata as a JSON response
            res.status(200).json(metadataList);
        } catch (error) {
            console.error("Error retrieving files:", error);
            res.status(500).json({ error: "Error retrieving files" });
        }
    });
}