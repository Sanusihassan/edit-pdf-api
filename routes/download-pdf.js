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
exports.setupDownloadPDFRoute = setupDownloadPDFRoute;
// @ts-ignore
const puppeteer_html_pdf_1 = __importDefault(require("puppeteer-html-pdf"));
function setupDownloadPDFRoute(app) {
    // @ts-ignore
    app.post("/download-pdf", (req, res) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            // Validate input
            const { pagesContainer, downloadOptions, pdfData } = req.body;
            if (!(pagesContainer === null || pagesContainer === void 0 ? void 0 : pagesContainer.trim())) {
                return res.status(400).json({ error: "Empty content provided" });
            }
            // Configure default options
            const defaultOptions = {
                layout: "portrait",
                paperSize: "A4",
                scale: 1,
                margin: "default",
                customMargins: { top: 10, right: 10, bottom: 10, left: 10 },
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
            // Configure PDF options with internet access enabled
            const pdfOptions = {
                format: finalOptions.paperSize === "custom" ? undefined : finalOptions.paperSize || "A4",
                landscape: finalOptions.layout === "landscape",
                scale: finalOptions.scale,
                printBackground: true,
                timeout: 60000, // Increased timeout for internet resources
                headless: true,
                // Updated args to allow internet access
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                    "--disable-web-security", // Allows cross-origin requests
                    "--disable-features=VizDisplayCompositor",
                    // Allow internet access
                    "--allow-running-insecure-content",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding"
                ],
                // Wait for network to be idle to ensure all images are loaded
                waitUntil: ['networkidle0', 'domcontentloaded'],
                // Additional options for better resource loading
                ignoreHTTPSErrors: true,
                // Set a user agent to avoid blocking
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
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
            // Enhanced HTML content with better image loading support
            const enhancedHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        .current-el-options {display: none!important}
                        
                        /* Ensure images load properly */
                        img {
                            max-width: 100%;
                            height: auto;
                            display: block;
                        }
                        
                        /* Wait for images to load */
                        img[src] {
                            opacity: 0;
                            transition: opacity 0.3s;
                        }
                        
                        img[src].loaded {
                            opacity: 1;
                        }
                        
                        /* Print-friendly styles */
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                        }
                    </style>
                    <script>
                        // Ensure all images are loaded before PDF generation
                        document.addEventListener('DOMContentLoaded', function() {
                            const images = document.querySelectorAll('img[src]');
                            let loadedCount = 0;
                            
                            function imageLoaded() {
                                loadedCount++;
                                this.classList.add('loaded');
                                if (loadedCount === images.length) {
                                    // All images loaded, ready for PDF generation
                                    document.body.classList.add('images-loaded');
                                }
                            }
                            
                            images.forEach(function(img) {
                                if (img.complete) {
                                    imageLoaded.call(img);
                                } else {
                                    img.addEventListener('load', imageLoaded);
                                    img.addEventListener('error', function() {
                                        console.warn('Image failed to load:', this.src);
                                        imageLoaded.call(this);
                                    });
                                }
                            });
                            
                            // If no images, mark as ready immediately
                            if (images.length === 0) {
                                document.body.classList.add('images-loaded');
                            }
                        });
                    </script>
                </head>
                <body>
                    ${pagesContainer}
                </body>
                </html>
            `;
            // Set options and generate PDF
            yield pdfGenerator.setOptions(pdfOptions);
            const pdfBuffer = yield pdfGenerator.create(enhancedHTML);
            // Validate PDF output
            if (!pdfBuffer || pdfBuffer.length < 200) {
                throw new Error("Generated PDF is empty or too small");
            }
            // Send response
            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="document.pdf"',
                "Content-Length": pdfBuffer.length.toString(),
            });
            res.send(pdfBuffer);
            // deleteFile(pdfData.fileId);
            // Close the browser to free resources
            yield pdfGenerator.closeBrowser();
        }
        catch (error) {
            console.error("PDF Generation Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({
                error: "PDF generation failed",
                details: errorMessage,
                timestamp: new Date().toISOString(),
            });
        }
    }));
}
