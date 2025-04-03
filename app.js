"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pdf_to_html_1 = require("./routes/pdf-to-html");
const save_pdf_data_1 = require("./routes/save-pdf-data");
const download_pdf_1 = require("./routes/download-pdf");
const get_pdf_files_1 = require("./routes/get-pdf-files");
const download_scanned_1 = require("./routes/download-scanned");
const delete_file_1 = require("./routes/delete-file");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 2025;
// if (process.env.NODE_ENV === "development") {
// }
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '100mb' }));
(0, pdf_to_html_1.setupPDFToHTMLRoute)(app);
(0, save_pdf_data_1.setupSavePDFDataRoute)(app);
(0, download_pdf_1.setupDownloadPDFRoute)(app);
(0, get_pdf_files_1.setupGetPDFFilesRoute)(app);
(0, download_scanned_1.setupDownloadScannedPDFRoute)(app);
(0, delete_file_1.setupDeletePDFFilesRoute)(app);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
