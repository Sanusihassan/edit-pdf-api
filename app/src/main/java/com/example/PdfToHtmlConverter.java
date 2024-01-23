package com.example;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.utils.PdfSplitter;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.html2pdf.HtmlConverter;

import java.io.*;
import java.util.List;

public class PdfToHtmlConverter {
    public void convert(String inputPath, String outputPath) throws Exception {
        try (PdfReader reader = new PdfReader(inputPath)) {
            List<String> pages = PdfSplitter.split(reader);
            StringBuilder sb = new StringBuilder();
            for (String page : pages) {
                PdfDocument pdfDoc = new PdfDocument(new PdfReader(page));
                Paragraph p = HtmlConverter.convertToElements(page)[0];
                sb.append(p.toString());
            }
            try (PrintWriter writer = new PrintWriter(new File(outputPath), "UTF-8")) {
                writer.println(sb.toString());
            }
        } catch (IOException e) {
            throw new Exception("Error occurred during conversion.", e);
        }
    }
}
