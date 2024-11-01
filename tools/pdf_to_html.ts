import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function PDFToHTML(pdfFilePath: string): Promise<{ scanned: boolean, content?: string }> {
  const outputFilePath = path.join('/tmp', `${uuidv4()}.html`);

  // First, check if the PDF is scanned
  const isScanned = await checkIfScannedPDF(pdfFilePath);

  if (isScanned) {
    return { scanned: true };
  }

  // If not scanned, proceed with conversion to HTML
  return new Promise((resolve, reject) => {
    const command = `java -jar ./PDFToHTML.jar "${pdfFilePath}" "${outputFilePath}" -fm=EMBED_BASE64 -im=EMBED_BASE64`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        return reject(error);
      }

      // Read the generated HTML file
      fs.readFile(outputFilePath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }

        // Clean up the generated HTML file after reading
        fs.unlinkSync(outputFilePath);
        resolve({ scanned: false, content: data });
      });
    });
  });
}

// Helper function to check if a PDF is scanned using ocrmypdf
async function checkIfScannedPDF(pdfFilePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const command = `ocrmypdf --skip-text "${pdfFilePath}" /dev/null`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        // If ocrmypdf exits with code 6, it means the PDF contains no text
        if (error.code === 6) {
          resolve(true);
        } else {
          console.error(`Error checking PDF: ${stderr}`);
          reject(error);
        }
      } else {
        resolve(false);
      }
    });
  });
}
