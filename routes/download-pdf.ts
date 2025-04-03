// this is where i'm using the PuppeteerHTMLPDF in the setupDownloadPDFRoute, i want to use the same for the scanned version.
import { Request, Response, Express } from "express";
// @ts-ignore
import PuppeteerHTMLPDF from "puppeteer-html-pdf";
import { deleteFile } from "../utils/pdf-storage";

// Define the PDFInfo interface
interface PDFInfo {
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

// Define the DownloadOptionsState interface
interface DownloadOptionsState {
    layout?: "portrait" | "landscape";
    paperSize?: string; // e.g., 'A4', 'Letter', 'custom'
    scale?: number; // Zoom level, e.g., 1
    margin?: "default" | "none" | "minimal" | "custom";
    customMargins?: { top: number; right: number; bottom: number; left: number }; // In millimeters
    duplex?: boolean; // Ignored for PDF generation
    customWidth?: number; // In inches, used if paperSize is 'custom'
    customHeight?: number; // In inches, used if paperSize is 'custom'
}

export function setupDownloadPDFRoute(app: Express) {
    // @ts-ignore
    app.post("/download-pdf", async (req: Request, res: Response) => {
        try {
            // Validate input
            const { pagesContainer, downloadOptions, pdfData } = req.body;

            if (!pagesContainer?.trim()) {
                return res.status(400).json({ error: "Empty content provided" });
            }

            // Configure default options
            const defaultOptions: DownloadOptionsState = {
                layout: "portrait",
                paperSize: "A4",
                scale: 1,
                margin: "default",
                customMargins: { top: 10, right: 10, bottom: 10, left: 10 },
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
${pagesContainer}
`
            );

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
            await pdfGenerator.closeBrowser();
        } catch (error) {
            console.error("PDF Generation Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            res.status(500).json({
                error: "PDF generation failed",
                details: errorMessage,
                timestamp: new Date().toISOString(),
            });
        }
    });
}