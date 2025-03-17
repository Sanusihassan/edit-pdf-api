import { Request, Response, Express } from 'express';
import fs from 'fs-extra';
import path from 'path';
import React from "react";
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
    // Endpoint to save individual page data
    app.post('/save-pdf-page', async (req: Request, res: Response) => {
        try {
            const { userId, pageId, elements } = req.body;
            if (!userId || !pageId || !elements) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            // Create a temporary directory for this user's pages
            const tempDir = path.join('/home/pdf/temp', userId);
            await fs.mkdir(tempDir, { recursive: true });

            // Save the page's elements as a JSON file
            const filePath = path.join(tempDir, `${pageId}.json`);
            await fs.writeFile(filePath, JSON.stringify(elements));

            res.status(200).json({ message: 'Page data saved' });
        } catch (error) {
            console.error('Error saving page data:', error);
            res.status(500).json({ error: 'Error saving page data' });
        }
    });

    app.post('/finalize-pdf', async (req: Request, res: Response) => {
        try {
            const { userId, styles, metaData } = req.body;

            // Validate required fields
            if (!userId || !styles) {
                res.status(400).json({ error: 'Missing userId or styles' });
                return;
            }

            // Define directories
            const tempDir = path.join('/home/pdf/temp', userId);
            const finalDir = path.join('/home/pdf', userId);

            // Ensure the final directory exists
            await fs.mkdir(finalDir, { recursive: true });

            // Read only .json files from the temporary directory
            const files = (await fs.readdir(tempDir)).filter((file: string) => file.endsWith('.json'));

            // Combine all page data into one object
            const elementsByPageId: Record<string, PDFElement[]> = {};
            for (const file of files) {
                const pageId = path.basename(file, '.json');
                const filePath = path.join(tempDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                elementsByPageId[pageId] = JSON.parse(data);
            }

            // Save document JSON data, overwriting any existing file
            const documentPath = path.join(finalDir, 'document.json');
            await fs.writeFile(documentPath, JSON.stringify(elementsByPageId));

            // Save styles.html, overwriting any existing file
            const stylesPath = path.join(finalDir, 'styles.html');
            await fs.writeFile(stylesPath, styles);

            // Save metadata JSON if provided, overwriting any existing file
            if (metaData) {
                const metadataPath = path.join(finalDir, 'metadata.json');
                await fs.writeFile(metadataPath, JSON.stringify(metaData, null, 2));
            }

            // Clean up the temporary directory
            await fs.rm(tempDir, { recursive: true, force: true });

            // Send success response
            res.status(200).json({
                message: 'PDF data finalized successfully',
                documentId: 'default', // Fixed value since files are overwritten
                directory: finalDir,
                metadataSaved: !!metaData // Indicates if metadata was saved
            });
        } catch (error) {
            console.error('Error finalizing PDF data:', error);
            res.status(500).json({
                error: 'Error finalizing PDF data',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}