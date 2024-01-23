package com.example;

import org.apache.pdfbox.pdmodel.PDDocument;
import net.sf.cssbox.pdf2dom.PDFDomTree;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class HtmlGenerator {
    public static String generateHtmlFromPdf(InputStream inputStream) throws IOException {
        PDDocument pdf = PDDocument.load(inputStream);
        PDFDomTree parser = new PDFDomTree();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Writer output = new PrintWriter(baos, true, StandardCharsets.UTF_8);
        parser.writeText(pdf, output);
        output.close();
        pdf.close();
        return new String(baos.toByteArray(), StandardCharsets.UTF_8);
    }
}