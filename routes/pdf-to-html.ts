import { Request, Response, Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import { PDFToHTML } from '../tools/pdf_to_html';

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
    // Check file type
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Custom error handler for multer
const handleMulterUpload = (req: Request, res: Response, next: Function) => {
  const uploadMiddleware = upload.single('pdfFile'); // Changed field name to 'pdfFile'

  uploadMiddleware(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 10MB limit' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};


// how can i recive the formData.append("isScanned", String(isScanned));?
// Route handler function
export function setupPDFToHTMLRoute(app: Express) {
  app.post('/get-pdf-data', handleMulterUpload, async (req: Request, res: Response): Promise<void> => {
    // const languages;
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file uploaded' });
        return;
      }

      const pdfFilePath = req.file.path;

      // Get isScanned from req.body
      const isScanned = req.body.isScanned === 'true';

      const selectedLanguages = JSON.parse(req.body.selectedLanguages);
      // Convert PDF to HTML
      const htmlContent = await PDFToHTML(pdfFilePath, isScanned, selectedLanguages);

      // Set response headers for file download
      res.setHeader('Content-Disposition', 'attachment; filename="converted.html"');
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);

      // Clean up the uploaded file
      fs.unlink(pdfFilePath, (err) => {
        if (err) console.error('Error deleting temporary file:', err);
      });
    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({
        error: 'Error converting PDF to HTML',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}