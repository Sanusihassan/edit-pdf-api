import { Request, Response, Express } from "express";
import fs from "fs-extra";
import path from "path";

// Define PDFElement interface (assuming this is your structure)
export interface PDFElement {
  id: string;
  type: string;
  content: string;
  style: React.CSSProperties;
  className: string;
  pageId: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export function setupSavePDFDataRoute(app: Express) {
  // Endpoint to save individual page data and thumbnail (unchanged)
  app.post("/save-pdf-page", async (req: Request, res: Response) => {
    try {
      const { userId, pageId, elements, thumbnail } = req.body;
      if (!userId || !pageId || !elements || thumbnail === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const tempDir = path.join("/home/pdf/temp", userId);
      await fs.mkdir(tempDir, { recursive: true });

      const elementsFilePath = path.join(tempDir, `${pageId}.json`);
      await fs.writeFile(elementsFilePath, JSON.stringify(elements));

      const thumbnailFilePath = path.join(tempDir, `${pageId}-thumbnail.json`);
      await fs.writeFile(thumbnailFilePath, JSON.stringify({ thumbnail }));

      res.status(200).json({ message: "Page data saved" });
    } catch (error) {
      console.error("Error saving page data:", error);
      res.status(500).json({ error: "Error saving page data" });
    }
  });

  // Endpoint to finalize PDF and save all files
  app.post("/finalize-pdf", async (req: Request, res: Response) => {
    try {
      const { userId, styles, metaData, pageStyles } = req.body;
      if (!userId || !styles || !metaData || !metaData.folderName || !pageStyles) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const folderName = metaData.folderName;
      if (
        typeof folderName !== "string" ||
        folderName.length === 0 ||
        folderName.length > 255 ||
        !/^[a-zA-Z0-9_-]+$/.test(folderName)
      ) {
        res.status(400).json({ error: "Invalid folderName" });
        return;
      }

      const tempDir = path.join("/home/pdf/temp", userId);
      const finalDir = path.join("/home/pdf", userId, folderName);
      await fs.mkdir(finalDir, { recursive: true });

      // Process page files from temp directory
      const elementFiles = (await fs.readdir(tempDir)).filter(
        (file) => file.endsWith(".json") && !file.includes("-thumbnail")
      );

      const documentData: Record<string, PDFElement[]> = {};
      const thumbnailsData: Record<string, string | null> = {};

      for (const file of elementFiles) {
        const pageId = path.basename(file, ".json");
        const elementsFilePath = path.join(tempDir, file);
        const elementsData = await fs.readFile(elementsFilePath, "utf-8");
        documentData[pageId] = JSON.parse(elementsData);

        const thumbnailFilePath = path.join(tempDir, `${pageId}-thumbnail.json`);
        if (await fs.pathExists(thumbnailFilePath)) {
          const thumbnailData = await fs.readFile(thumbnailFilePath, "utf-8");
          const { thumbnail } = JSON.parse(thumbnailData);
          thumbnailsData[pageId] = thumbnail;
        } else {
          thumbnailsData[pageId] = null;
        }
      }

      // Save document.json
      const documentPath = path.join(finalDir, "document.json");
      await fs.writeFile(documentPath, JSON.stringify(documentData));

      // Save thumbnails.json
      const thumbnailsPath = path.join(finalDir, "thumbnails.json");
      await fs.writeFile(thumbnailsPath, JSON.stringify(thumbnailsData));

      // Save styles.html (as is, like before)
      const stylesPath = path.join(finalDir, "styles.html");
      await fs.writeFile(stylesPath, styles);

      // Save pageStyles.json (new, as JSON)
      const pageStylesPath = path.join(finalDir, "pageStyles.json");
      await fs.writeFile(pageStylesPath, JSON.stringify(pageStyles));

      // Save metadata.json
      const metadataPath = path.join(finalDir, "metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metaData, null, 2));

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

      res.status(200).json({ message: "PDF data finalized successfully" });
    } catch (error) {
      console.error("Error finalizing PDF data:", error);
      res.status(500).json({ error: "Error finalizing PDF data" });
    }
  });
}