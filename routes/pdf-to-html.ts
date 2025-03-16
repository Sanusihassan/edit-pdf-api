import { Request, Response, Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PDFToHTML } from '../tools/pdf_to_html';
import { v4 } from 'uuid';

// Promisify exec for async operations
const execPromise = promisify(exec);

// Define the structure for PDF data (for type safety, though we won’t store it globally)
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
}

// Generate a unique ID
export const uid = v4();

// Configure multer storage
const storage = multer.diskStorage({
  destination: '/tmp/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Custom error handler for multer
const handleMulterUpload = (req: Request, res: Response, next: Function) => {
  const uploadMiddleware = upload.single('pdfFile');
  uploadMiddleware(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 100MB limit' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

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
  app.post('/get-pdf-data', handleMulterUpload, async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const pdfFilePath = req.file.path;
      const userId = req.body.userId || uid; // Extract userId from form data
      const isScanned = req.body.isScanned === 'true'; // Extract isScanned from form data
      const selectedLanguages = JSON.parse(req.body.selectedLanguages);

      // Extract PDF info using pdfinfo from poppler-utils
      const { stdout } = await execPromise(`pdfinfo ${pdfFilePath}`);
      const pdfInfo = parsePDFInfo(stdout);

      // Check if page size was successfully extracted
      if (pdfInfo.pageSize.width === 0 || pdfInfo.pageSize.height === 0) {
        fs.unlinkSync(pdfFilePath);
        res.status(500).json({ error: 'Could not extract page size' });
        return;
      }

      // Convert PDF to HTML
      const htmlContent = await PDFToHTML(pdfFilePath, isScanned, selectedLanguages);

      // Send both HTML content and pdfinfo as a JSON response
      res.json({
        htmlContent: htmlContent,
        pdfInfo: pdfInfo
      });

      // Clean up the uploaded file
      fs.unlink(pdfFilePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({
        error: 'Error processing PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      // Ensure file is deleted on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }
  });
}