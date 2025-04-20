declare module 'pdf-image' {
  class PDFImage {
    constructor(pdfPath: string, options?: any);
    numberOfPages(): Promise<number>;
    convertPage(pageNum: number): Promise<string>;
  }
  export { PDFImage };
} 