package com.example;

import java.io.*;
import java.util.List;

public class PdfToHtmlConverter {
    public void convert(String inputPath, String outputPath) throws Exception {
    try (FileInputStream fis = new FileInputStream(inputPath)) {
        String html = HtmlGenerator.generateHtmlFromPdf(fis);
        try (PrintWriter writer = new PrintWriter(new File(outputPath), "UTF-8")) {
            writer.print(html);
        }
    } catch (IOException e) {
        throw new Exception("Error occurred during conversion.", e);
    }
}
}
