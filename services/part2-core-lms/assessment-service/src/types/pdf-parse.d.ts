declare module 'pdf-parse-new' {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
  }

  const pdfParse: (buffer: Buffer, options?: Record<string, any>) => Promise<PdfParseResult>;
  export = pdfParse;
}
