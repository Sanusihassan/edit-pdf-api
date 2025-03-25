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
exports.setupDownloadScannedPDFRoute = setupDownloadScannedPDFRoute;
const pdf_storage_1 = require("../utils/pdf-storage");
const pdf_to_html_1 = require("../tools/pdf_to_html");
const insertAnnotations_1 = require("../tools/insertAnnotations");
const puppeteer_html_pdf_1 = __importDefault(require("puppeteer-html-pdf"));
function setupDownloadScannedPDFRoute(app) {
    // @ts-ignore
    app.post("/download-scanned", (req, res) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { PDFInfo, elementsByPageId, downloadOptions, styles } = req.body;
            const { fileId } = PDFInfo;
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }
            const fileInfo = (0, pdf_storage_1.getFile)(fileId);
            console.log(fileInfo, fileId);
            if (!fileInfo) {
                return res.status(404).json({ error: 'File not found. It may have been deleted or expired.' });
            }
            // Access the PDF file
            const filePath = fileInfo.path;
            const outputPath = filePath.replace(/\.pdf$/, ".html");
            // Convert PDF to HTML
            const htmlContent = yield (0, pdf_to_html_1.convertToHTML)(filePath, outputPath, pdf_to_html_1.JAR_PATH);
            // Insert annotations
            const annotatedHtml = (0, insertAnnotations_1.insertAnnotations)(htmlContent, elementsByPageId);
            // Configure default options
            const defaultOptions = {
                layout: "portrait",
                paperSize: PDFInfo.pageSize.sizeType || "A4",
                scale: 1,
                margin: "default",
                customMargins: { top: 10, right: 10, bottom: 10, left: 10 },
                duplex: false
            };
            const finalOptions = Object.assign(Object.assign({}, defaultOptions), downloadOptions);
            // Validate scale parameter
            if (typeof finalOptions.scale !== "number" || finalOptions.scale < 0.1 || finalOptions.scale > 2) {
                return res.status(400).json({
                    error: `Invalid scale value: ${finalOptions.scale}. Must be between 0.1 and 2`,
                });
            }
            // Initialize PuppeteerHTMLPDF
            const pdfGenerator = new puppeteer_html_pdf_1.default();
            // Configure PDF options
            const pdfOptions = {
                format: finalOptions.paperSize === "custom" ? undefined : finalOptions.paperSize || "A4",
                landscape: finalOptions.layout === "landscape",
                scale: finalOptions.scale,
                printBackground: true,
                timeout: 30000,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
                headless: true,
            };
            // Handle custom paper size
            if (finalOptions.paperSize === "custom") {
                if (!finalOptions.customWidth || !finalOptions.customHeight) {
                    return res.status(400).json({
                        error: "Custom paper size requires width and height",
                    });
                }
                pdfOptions.width = `${finalOptions.customWidth}in`;
                pdfOptions.height = `${finalOptions.customHeight}in`;
            }
            // Margin configuration (converted from mm to cm for simplicity)
            if (finalOptions.margin === "none") {
                pdfOptions.margin = { top: "0cm", right: "0cm", bottom: "0cm", left: "0cm" };
            }
            else if (finalOptions.margin === "minimal") {
                pdfOptions.margin = { top: "0.5cm", right: "0.5cm", bottom: "0.5cm", left: "0.5cm" };
            }
            else if (finalOptions.margin === "custom") {
                pdfOptions.margin = {
                    top: `${(((_a = finalOptions.customMargins) === null || _a === void 0 ? void 0 : _a.top) || 0) / 10}cm`,
                    right: `${(((_b = finalOptions.customMargins) === null || _b === void 0 ? void 0 : _b.right) || 0) / 10}cm`,
                    bottom: `${(((_c = finalOptions.customMargins) === null || _c === void 0 ? void 0 : _c.bottom) || 0) / 10}cm`,
                    left: `${(((_d = finalOptions.customMargins) === null || _d === void 0 ? void 0 : _d.left) || 0) / 10}cm`,
                };
            }
            else {
                // Default margin
                pdfOptions.margin = { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" };
            }
            // Set options and generate PDF
            yield pdfGenerator.setOptions(pdfOptions);
            const pdfBuffer = yield pdfGenerator.create(`<style>
                .current-el-options {display: none!important}
                </style>
                ${styles}
${annotatedHtml}
`);
            // Validate PDF output
            if (!pdfBuffer || pdfBuffer.length < 200) {
                throw new Error("Generated PDF is empty or too small");
            }
            // Send response
            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${PDFInfo.title || 'document'}.pdf"`,
                "Content-Length": pdfBuffer.length.toString(),
            });
            res.send(pdfBuffer);
            (0, pdf_storage_1.deleteFile)(fileId);
            // Close the browser to free resources
            yield pdfGenerator.closeBrowser();
        }
        catch (error) {
            console.error('Download error:', error);
            res.status(500).json({
                error: 'Error processing download request',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }));
}
