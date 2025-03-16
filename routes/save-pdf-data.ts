import { Request, Response, Express } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
            const { userId, styles } = req.body;
            
            // Validate required fields
            if (!userId || !styles) {
                res.status(400).json({ error: 'Missing userId or styles' });
                return;
            }

            const tempDir = path.join('/home/pdf/temp', userId);
            const files = await fs.readdir(tempDir);

            // Combine all page data into one object
            const elementsByPageId: Record<string, PDFElement[]> = {};
            for (const file of files) {
                const pageId = path.basename(file, '.json');
                const filePath = path.join(tempDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                elementsByPageId[pageId] = JSON.parse(data);
            }

            // Create final directory structure
            const finalBaseDir = path.join('/home/pdf', userId);
            const uniqueId = uuidv4();
            const finalDir = path.join(finalBaseDir, uniqueId); // Create unique subdirectory
            
            // Ensure directories exist
            await fs.mkdir(finalDir, { recursive: true });

            // Save JSON data
            const finalFilePath = path.join(finalDir, 'document.json');
            await fs.writeFile(finalFilePath, JSON.stringify(elementsByPageId));

            // Save styles.html
            const stylesPath = path.join(finalDir, 'styles.html');
            await fs.writeFile(stylesPath, styles);

            // Clean up the temporary directory
            await fs.rm(tempDir, { recursive: true, force: true });

            res.status(200).json({ 
                message: 'PDF data finalized successfully',
                documentId: uniqueId,
                directory: finalDir
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