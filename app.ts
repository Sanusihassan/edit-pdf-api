// this is my express, ts app, i want to create another handler that i can use here like this: 
// PDFToHTML(app); which binds /convert-to-html to the router i'll be using another PDFToHTML(pdf) function that i'll be defining somewhere else, but for now just give me the route handler.
// this route handler should return a HTML file for download. it should use the internal PDFToHTML(pdf) for the conversion.
import express from 'express';
import cors from "cors";
import { setupPDFToHTMLRoute } from './routes/pdf-to-html';

const app = express();
const PORT = process.env.PORT || 3000;


if(process.env.NODE_ENV === "development") {
    app.use(cors())
}

setupPDFToHTMLRoute(app);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
