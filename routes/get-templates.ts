import { Express, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';

// Mapping of template types to folder names
const typeToFolder: { [key: string]: string } = {
    "blank": "blank-page",
    "resume": "Professional-Resume",
    "meeting": "meeting-notes",
    "report": "report"
};

/**
 * Sets up a GET route to retrieve template files based on the template type, including metadata.
 * @param app - The Express application instance
 */
export function setupGetTemplateRoute(app: Express) {
    app.get("/get-template/:type", async (req: Request, res: Response) => {
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
            if (!await fs.pathExists(templateDir)) {
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

            // Read metadata.json (as JSON)
            let metadataContent = null;
            if (await fs.pathExists(metadataPath)) {
                const metadataData = await fs.readFile(metadataPath, "utf-8");
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
        } catch (error) {
            console.error("Error retrieving template files:", error);
            res.status(500).json({ error: "Error retrieving template files" });
        }
    });
}