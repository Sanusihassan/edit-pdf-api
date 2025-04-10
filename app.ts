import express from 'express';
import cors from "cors";
import { setupPDFToHTMLRoute } from './routes/pdf-to-html';
import { setupSavePDFDataRoute } from './routes/save-pdf-data';
import { setupDownloadPDFRoute } from './routes/download-pdf';
import { setupGetPDFFilesRoute } from './routes/get-pdf-files';
import { setupDownloadScannedPDFRoute } from './routes/download-scanned';
import { setupDeletePDFFilesRoute } from './routes/delete-file';
import { setupGetTemplateRoute } from './routes/get-templates';

const app = express();
const PORT = process.env.PORT || 2025;

// if (process.env.NODE_ENV === "development") {
// }
app.use(cors())


app.use(express.json({ limit: '100mb' }));

setupPDFToHTMLRoute(app);
setupSavePDFDataRoute(app);
setupDownloadPDFRoute(app);
setupGetPDFFilesRoute(app);
setupDownloadScannedPDFRoute(app);
setupDeletePDFFilesRoute(app);
setupGetTemplateRoute(app);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
