import { Request, Response, Express } from "express";
import { getFile, deleteFile } from "../utils/pdf-storage";
import { convertToHTML, JAR_PATH } from "../tools/pdf_to_html";
import { insertAnnotations } from "../tools/insertAnnotations";
import PuppeteerHTMLPDF from "puppeteer-html-pdf";


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
    fileId?: string;
}

interface DownloadOptionsState {
    layout: 'portrait' | 'landscape';
    paperSize: string;
    scale: number;
    margin: 'default' | 'none' | 'minimal' | 'custom';
    customMargins: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    duplex: boolean;
    customWidth?: number;
    customHeight?: number;
}

export function setupDownloadScannedPDFRoute(app: Express) {
    // @ts-ignore
    app.post("/download-scanned", async (req: Request, res: Response) => {
        try {
            const { PDFInfo, elementsByPageId, downloadOptions, styles } = req.body;

            const { fileId } = PDFInfo;

            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }

            const fileInfo = getFile(fileId);
            console.log(fileInfo, fileId)
            if (!fileInfo) {
                return res.status(404).json({ error: 'File not found. It may have been deleted or expired.' });
            }

            // Access the PDF file
            const filePath = fileInfo.path;
            const outputPath = filePath.replace(/\.pdf$/, ".html");

            // Convert PDF to HTML
            const htmlContent = await convertToHTML(filePath, outputPath, JAR_PATH);

            // Insert annotations
            const annotatedHtml = insertAnnotations(htmlContent, elementsByPageId);

            // Configure default options
            const defaultOptions: DownloadOptionsState = {
                layout: "portrait",
                paperSize: PDFInfo.pageSize.sizeType || "A4",
                scale: 1,
                margin: "default",
                customMargins: { top: 10, right: 10, bottom: 10, left: 10 },
                duplex: false
            };

            const finalOptions = { ...defaultOptions, ...downloadOptions };

            // Validate scale parameter
            if (typeof finalOptions.scale !== "number" || finalOptions.scale < 0.1 || finalOptions.scale > 2) {
                return res.status(400).json({
                    error: `Invalid scale value: ${finalOptions.scale}. Must be between 0.1 and 2`,
                });
            }

            // Initialize PuppeteerHTMLPDF
            const pdfGenerator = new PuppeteerHTMLPDF();

            // Configure PDF options
            const pdfOptions: any = {
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
            } else if (finalOptions.margin === "minimal") {
                pdfOptions.margin = { top: "0.5cm", right: "0.5cm", bottom: "0.5cm", left: "0.5cm" };
            } else if (finalOptions.margin === "custom") {
                pdfOptions.margin = {
                    top: `${(finalOptions.customMargins?.top || 0) / 10}cm`,
                    right: `${(finalOptions.customMargins?.right || 0) / 10}cm`,
                    bottom: `${(finalOptions.customMargins?.bottom || 0) / 10}cm`,
                    left: `${(finalOptions.customMargins?.left || 0) / 10}cm`,
                };
            } else {
                // Default margin
                pdfOptions.margin = { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" };
            }

            // Set options and generate PDF
            await pdfGenerator.setOptions(pdfOptions);
            const pdfBuffer = await pdfGenerator.create(
                `<style>
                .current-el-options {display: none!important}
                </style>
                ${styles}
${annotatedHtml}
`
            );

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
            deleteFile(fileId);

            // Close the browser to free resources
            await pdfGenerator.closeBrowser();
        } catch (error) {
            console.error('Download error:', error);
            res.status(500).json({
                error: 'Error processing download request',
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    });
}