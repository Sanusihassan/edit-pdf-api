import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface PDFAnalysisResult {
  scanned: boolean;
  content?: string;
  confidence?: number;
}

const JAR_PATH = "/home/edit-pdf-api/tools/PDFToHTML.jar";

export async function PDFToHTML(pdfFilePath: string, isScanned: boolean, selectedLanguages: string[]): Promise<PDFAnalysisResult> {
  let pdfToConvert = pdfFilePath;
  let ocrPdfPath: string | null = null;

  try {
    if (isScanned && !selectedLanguages.length) {
      return {
        scanned: true
      }
    }
    // Handle scanned PDFs by running OCRmyPDF
    if (isScanned) {
      const tempId = uuidv4();
      ocrPdfPath = path.join('/tmp', `ocr-${tempId}.pdf`);
      const langString = selectedLanguages.length > 0 ? selectedLanguages.join('+') : 'eng'; // Default to 'eng' if no languages provided
      await runOcrMyPdf(pdfFilePath, ocrPdfPath, langString);
      pdfToConvert = ocrPdfPath;
    }

    // Convert the PDF (original or OCR'd) to HTML
    const htmlOutputPath = path.join('/tmp', `html-${uuidv4()}.html`);
    const htmlContent = await convertToHTML(pdfToConvert, htmlOutputPath, JAR_PATH);

    return {
      scanned: false,
      content: htmlContent,
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  } finally {
    // Clean up the temporary OCR'd PDF if it was created
    if (ocrPdfPath) {
      await fs.promises.unlink(ocrPdfPath).catch((err) => console.error('Error deleting OCR PDF:', err));
    }
  }
}

async function runOcrMyPdf(inputPath: string, outputPath: string, languages: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `ocrmypdf --language ${languages} "${inputPath}" "${outputPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`OCRmyPDF error: ${stderr}`);
        return reject(error);
      }
      resolve();
    });
  });
}

async function convertToHTML(
  pdfPath: string,
  outputPath: string,
  jarPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `java -jar ${jarPath} "${pdfPath}" "${outputPath}" -fm=EMBED_BASE64 -im=EMBED_BASE64`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Conversion error: ${stderr}`);
        return reject(error);
      }
      fs.readFile(outputPath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }
        // Clean up the generated HTML file
        fs.unlink(outputPath, (unlinkError) => {
          if (unlinkError) {
            console.error('Error cleaning up HTML file:', unlinkError);
          }
        });
        resolve(data);
      });
    });
  });
}