/**
 the thumbnails are not stored in the server:
root@vmi1914414:/home# cd pdf/cb7ee29b-0b66-49c4-99a1-88e8614ddd69/Sanusi-Resume/
root@vmi1914414:/home/pdf/cb7ee29b-0b66-49c4-99a1-88e8614ddd69/Sanusi-Resume# ls
document.json  metadata.json  styles.html
root@vmi1914414:/home/pdf/cb7ee29b-0b66-49c4-99a1-88e8614ddd69/Sanusi-Resume# 
 */
import { Request, Response, Express } from "express";
import fs from "fs-extra";
import path from "path";
import React from "react";

// Define PDFElement interface
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
  // Endpoint to save individual page data and thumbnail
  app.post("/save-pdf-page", async (req: Request, res: Response) => {
      try {
        const { userId, pageId, elements, thumbnail } = req.body;
      if (!userId || !pageId || !elements || thumbnail === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const tempDir = path.join("/home/pdf/temp", userId);
      await fs.mkdir(tempDir, { recursive: true });

      // Save elements to pageId.json
      const elementsFilePath = path.join(tempDir, `${pageId}.json`);
      await fs.writeFile(elementsFilePath, JSON.stringify(elements));

      // Save thumbnail to pageId-thumbnail.json
      const thumbnailFilePath = path.join(tempDir, `${pageId}-thumbnail.json`);
      await fs.writeFile(thumbnailFilePath, JSON.stringify({ thumbnail }));

      res.status(200).json({ message: "Page data saved" });
    } catch (error) {
      console.error("Error saving page data:", error);
      res.status(500).json({ error: "Error saving page data" });
    }
  });

  // Endpoint to finalize PDF and save document.json, thumbnails.json, etc.
  app.post("/finalize-pdf", async (req: Request, res: Response) => {
    try {
      const { userId, styles, metaData } = req.body;
      if (!userId || !styles || !metaData || !metaData.folderName) {
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

      // Get all element files (excluding thumbnail files)
      const elementFiles = (await fs.readdir(tempDir)).filter(
        (file) => file.endsWith(".json") && !file.includes("-thumbnail")
      );

      const documentData: Record<string, PDFElement[]> = {};
      const thumbnailsData: Record<string, string | null> = {};

      // Process each page
      for (const file of elementFiles) {
        const pageId = path.basename(file, ".json");

        // Load elements
        const elementsFilePath = path.join(tempDir, file);
        const elementsData = await fs.readFile(elementsFilePath, "utf-8");
        documentData[pageId] = JSON.parse(elementsData);

        // Load thumbnail
        const thumbnailFilePath = path.join(tempDir, `${pageId}-thumbnail.json`);
        if (await fs.pathExists(thumbnailFilePath)) {
          const thumbnailData = await fs.readFile(thumbnailFilePath, "utf-8");
          const { thumbnail } = JSON.parse(thumbnailData);
          thumbnailsData[pageId] = thumbnail;
        } else {
          thumbnailsData[pageId] = null; // Fallback if thumbnail file is missing
        }
      }

      // Save document.json (elements only)
      const documentPath = path.join(finalDir, "document.json");
      await fs.writeFile(documentPath, JSON.stringify(documentData));

      // Save thumbnails.json
      const thumbnailsPath = path.join(finalDir, "thumbnails.json");
      await fs.writeFile(thumbnailsPath, JSON.stringify(thumbnailsData));

      // Save styles.html
      const stylesPath = path.join(finalDir, "styles.html");
      await fs.writeFile(stylesPath, styles);

      // Save metadata.json
      const metadataPath = path.join(finalDir, "metadata.json");
      await fs.writeFile(metadataPath, JSON.stringify(metaData, null, 2));

      // Clean up temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });

      res.status(200).json({ message: "PDF data finalized successfully" });
    } catch (error) {
      console.error("Error finalizing PDF data:", error);
      res.status(500).json({ error: "Error finalizing PDF data" });
    }
  });
}