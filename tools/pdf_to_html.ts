import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf';

// Initialize PDF.js worker
const initializePDFWorker = () => {
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const WORKER_PATH = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_PATH;
  }
};

interface PDFAnalysisResult {
  scanned: boolean;
  content?: string;
  confidence?: number;
}

export async function PDFToHTML(pdfFilePath: string): Promise<PDFAnalysisResult> {
  try {
    // Initialize worker before processing
    initializePDFWorker();
    
    // First, analyze the PDF
    const analysisResult = await analyzePDF(pdfFilePath);
    
    if (analysisResult.scanned) {
      return {
        scanned: true,
        confidence: analysisResult.confidence
      };
    }

    const JAR_PATH = process.env.NODE_ENV === "development" 
      ? "/workspaces/edit-pdf-api/tools/PDFToHTML.jar" 
      : "/home/edit-pdf-api/tools/PDFToHTML.jar";

    const outputFilePath = path.join('/tmp', `${uuidv4()}.html`);

    // If not scanned, proceed with conversion to HTML
    const htmlContent = await convertToHTML(pdfFilePath, outputFilePath, JAR_PATH);
    
    return {
      scanned: false,
      content: htmlContent,
      confidence: analysisResult.confidence
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

async function analyzePDF(pdfPath: string): Promise<{ scanned: boolean; confidence: number }> {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await getDocument({ data }).promise;
    
    let totalPages = pdf.numPages;
    let textContent = '';
    let imageCount = 0;
    let totalArea = 0;
    let imageArea = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Get page text content
      const content = await page.getTextContent();
      textContent += content.items.map(item => 'str' in item ? item.str : '').join(' ');
      
      // Get page operations (including images)
      const ops = await page.getOperatorList();
      const viewport = page.getViewport({ scale: 1.0 });
      totalArea += viewport.width * viewport.height;

      // Count and analyze images
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === pdfjsLib.OPS.paintImageXObject || 
            ops.fnArray[i] === pdfjsLib.OPS.paintInlineImageXObject) {
          imageCount++;
          // Estimate image area (this is approximate)
          const args = ops.argsArray[i];
          if (args && args.length >= 2) {
            imageArea += (args[0] * args[1]); // width * height
          }
        }
      }
    }

    // Analysis criteria
    const textLength = textContent.trim().length;
    const imageRatio = imageArea / totalArea;
    const wordsPerPage = textContent.split(/\s+/).length / totalPages;
    
    // Calculate confidence score (0-1)
    let confidence = 0;
    
    if (imageRatio > 0.5 && wordsPerPage < 50) {
      confidence += 0.4;
    }
    if (textLength < 100 && imageCount > 0) {
      confidence += 0.3;
    }
    if (imageCount >= totalPages) {
      confidence += 0.3;
    }

    // Additional heuristics
    const hasRegularTextStructure = /^[A-Za-z0-9\s.,!?-]+$/.test(textContent);
    if (!hasRegularTextStructure && imageCount > 0) {
      confidence += 0.2;
    }

    // Normalize confidence to 0-1
    confidence = Math.min(1, confidence);

    return {
      scanned: confidence > 0.6, // Consider it scanned if confidence > 60%
      confidence
    };
  } catch (error) {
    console.error('Error analyzing PDF:', error);
    throw error;
  }
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