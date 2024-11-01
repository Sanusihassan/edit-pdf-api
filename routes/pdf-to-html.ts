import { Request, Response, Express } from 'express';
import multer from 'multer';
import fs from 'fs';
import { PDFToHTML } from '../tools/pdf_to_html';

const upload = multer({ dest: '/tmp/' });

// Route handler function
export function setupPDFToHTMLRoute(app: Express) {
    app.post('/convert-to-html', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
        try {
          if (!req.file) {
            res.status(400).send('No PDF file uploaded.');
            return;
          }
      
          const pdfFilePath = req.file.path;
      
          // Convert PDF to HTML
          const htmlContent = await PDFToHTML(pdfFilePath);
      
          // Set response headers for file download
          res.setHeader('Content-Disposition', 'attachment; filename="converted.html"');
          res.setHeader('Content-Type', 'text/html');
          res.send(htmlContent);
      
          // Clean up the uploaded file
          fs.unlinkSync(pdfFilePath);
        } catch (error) {
          console.error(error);
          res.status(500).send('Error converting PDF to HTML.');
        }
      });
      
}