import { Request, Response, Express } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PDFToHTML } from '../tools/pdf_to_html';
import { handlePDFUpload, getFile, deleteFile } from "../utils/pdf-storage";

// Promisify exec for async operations
const execPromise = promisify(exec);

// Define the structure for PDF data (for type safety)
export interface PDFInfo {
  title?: string;
  producer?: string;
  tagged?: string;
  userProperties?: string;
  suspects?: string;
  form?: string;
  javaScript?: string;
  pages?: number;
  encrypted?: string;
  pageSize: { width: number; height: number; sizeType?: string };
  pageRot?: number;
  fileSize?: string;
  optimized?: string;
  pdfVersion?: string;
  fileId?: string; // Added fileId for referencing
}

// Function to parse pdfinfo output into a structured object
function parsePDFInfo(stdout: string): PDFInfo {
  const lines = stdout.split('\n');
  const pdfInfo: PDFInfo = { pageSize: { width: 0, height: 0 } };

  for (const line of lines) {
    const [key, value] = line.split(':').map(part => part.trim());
    if (!key || !value) continue;

    switch (key) {
      case 'Title':
        pdfInfo.title = value;
        break;
      case 'Producer':
        pdfInfo.producer = value;
        break;
      case 'Tagged':
        pdfInfo.tagged = value;
        break;
      case 'UserProperties':
        pdfInfo.userProperties = value;
        break;
      case 'Suspects':
        pdfInfo.suspects = value;
        break;
      case 'Form':
        pdfInfo.form = value;
        break;
      case 'JavaScript':
        pdfInfo.javaScript = value;
        break;
      case 'Pages':
        pdfInfo.pages = parseInt(value, 10);
        break;
      case 'Encrypted':
        pdfInfo.encrypted = value;
        break;
      case 'Page size':
        const sizeMatch = value.match(/([\d.]+) x ([\d.]+) pts(?: \(([^)]+)\))?/);
        if (sizeMatch) {
          pdfInfo.pageSize = {
            width: parseFloat(sizeMatch[1]),
            height: parseFloat(sizeMatch[2]),
            sizeType: sizeMatch[3] // e.g., "letter" or undefined if not present
          };
        }
        break;
      case 'Page rot':
        pdfInfo.pageRot = parseInt(value, 10);
        break;
      case 'File size':
        pdfInfo.fileSize = value;
        break;
      case 'Optimized':
        pdfInfo.optimized = value;
        break;
      case 'PDF version':
        pdfInfo.pdfVersion = value;
        break;
    }
  }

  return pdfInfo;
}

// Route handler function
export function setupPDFToHTMLRoute(app: Express) {
  app.post('/get-pdf-data', handlePDFUpload, async (req: Request & { fileId?: string }, res: Response): Promise<void> => {
    try {
      if (!req.fileId) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const fileInfo = getFile(req.fileId);
      if (!fileInfo) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const pdfFilePath = fileInfo.path;
      const isScanned = req.body.isScanned === 'true';
      const selectedLanguages = JSON.parse(req.body.selectedLanguages || '[]');

      // Extract PDF info using pdfinfo from poppler-utils
      const { stdout } = await execPromise(`pdfinfo ${pdfFilePath}`);
      const pdfInfo = parsePDFInfo(stdout);

      // Add fileId to the pdfInfo for reference
      pdfInfo.fileId = req.fileId;

      // Check if page size was successfully extracted
      if (pdfInfo.pageSize.width === 0 || pdfInfo.pageSize.height === 0) {
        deleteFile(req.fileId);
        res.status(500).json({ error: 'Could not extract page size' });
        return;
      }

      // Convert PDF to HTML
      const htmlContent = await PDFToHTML(pdfFilePath, isScanned, selectedLanguages);

      // Send both HTML content and pdfinfo as a JSON response
      res.json({
        fileId: req.fileId,
        htmlContent: htmlContent,
        pdfInfo: pdfInfo
      });

      // Note: We're NOT deleting the file here anymore
      // It will be available for other routes to use
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({
        error: 'Error processing PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      });

      // Delete the file on error
      if (req.fileId) {
        deleteFile(req.fileId);
      }
    }
  });
}