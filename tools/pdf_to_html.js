"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFToHTML = PDFToHTML;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const JAR_PATH = "/home/edit-pdf-api/tools/PDFToHTML.jar";
function PDFToHTML(pdfFilePath, isScanned, selectedLanguages) {
    return __awaiter(this, void 0, void 0, function* () {
        let pdfToConvert = pdfFilePath;
        let ocrPdfPath = null;
        try {
            if (isScanned && !selectedLanguages.length) {
                return {
                    scanned: true
                };
            }
            // Handle scanned PDFs by running OCRmyPDF
            if (isScanned) {
                const tempId = (0, uuid_1.v4)();
                ocrPdfPath = path_1.default.join('/tmp', `ocr-${tempId}.pdf`);
                const langString = selectedLanguages.length > 0 ? selectedLanguages.join('+') : 'eng'; // Default to 'eng' if no languages provided
                yield runOcrMyPdf(pdfFilePath, ocrPdfPath, langString);
                pdfToConvert = ocrPdfPath;
            }
            // Convert the PDF (original or OCR'd) to HTML
            const htmlOutputPath = path_1.default.join('/tmp', `html-${(0, uuid_1.v4)()}.html`);
            const htmlContent = yield convertToHTML(pdfToConvert, htmlOutputPath, JAR_PATH);
            return {
                scanned: false,
                content: htmlContent,
            };
        }
        catch (error) {
            console.error('Error processing PDF:', error);
            throw error;
        }
        finally {
            // Clean up the temporary OCR'd PDF if it was created
            if (ocrPdfPath) {
                yield fs_1.default.promises.unlink(ocrPdfPath).catch((err) => console.error('Error deleting OCR PDF:', err));
            }
        }
    });
}
function runOcrMyPdf(inputPath, outputPath, languages) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const command = `ocrmypdf --language ${languages} "${inputPath}" "${outputPath}"`;
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`OCRmyPDF error: ${stderr}`);
                    return reject(error);
                }
                resolve();
            });
        });
    });
}
function convertToHTML(pdfPath, outputPath, jarPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const command = `java -jar ${jarPath} "${pdfPath}" "${outputPath}" -fm=EMBED_BASE64 -im=EMBED_BASE64`;
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Conversion error: ${stderr}`);
                    return reject(error);
                }
                fs_1.default.readFile(outputPath, 'utf8', (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    // Clean up the generated HTML file
                    fs_1.default.unlink(outputPath, (unlinkError) => {
                        if (unlinkError) {
                            console.error('Error cleaning up HTML file:', unlinkError);
                        }
                    });
                    resolve(data);
                });
            });
        });
    });
}
