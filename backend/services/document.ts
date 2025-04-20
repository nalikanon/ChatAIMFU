import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import iconv from 'iconv-lite';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';

interface CsvRow {
  [key: string]: string;
}

const execAsync = promisify(exec);

export class DocumentService {
  private cleanText(text: string): string {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async processPDFInChunks(filePath: string): Promise<string> {
    let text = '';
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const fileStream = createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
    
    return new Promise((resolve, reject) => {
      let buffer = Buffer.from([]);
      
      fileStream.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
      });
      
      fileStream.on('end', async () => {
        try {
          const pdfData = await pdf(buffer);
          text = this.cleanText(pdfData.text);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      });
      
      fileStream.on('error', (error: Error) => reject(error));
    });
  }

  private async processCSVInChunks(filePath: string): Promise<string> {
    let text = '';
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: CsvRow) => {
          const values = Object.values(row)
            .filter(value => value && value.trim().length > 0);
          if (values.length > 0) {
            text += values.join(',') + '\n';
          }
        })
        .on('end', () => resolve(this.cleanText(text)))
        .on('error', (error: Error) => reject(error));
    });
  }

  async processFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    
    try {
      let text = '';

      switch (ext) {
        case '.pdf':
          try {
            text = await this.processPDFInChunks(file.path);
            
            if (!text || text.trim().length < 100) {
              const outputPath = `${file.path}-page`;
              await execAsync(`pdftoppm -png "${file.path}" "${outputPath}"`);
              
              const worker = await createWorker('eng+tha');
              const pages = await fs.readdir(path.dirname(file.path));
              
              let ocrText = '';
              for (const page of pages.filter(p => p.startsWith(path.basename(outputPath)))) {
                const pagePath = path.join(path.dirname(file.path), page);
                const { data: { text: pageText } } = await worker.recognize(pagePath);
                ocrText += pageText + '\n';
                await fs.unlink(pagePath);
              }
              await worker.terminate();
              text = this.cleanText(ocrText);
            }
          } catch (error) {
            console.error('PDF processing error:', error);
            throw error;
          }
          break;

        case '.doc':
        case '.docx':
          const buffer = await fs.readFile(file.path);
          const wordResult = await mammoth.extractRawText({ buffer });
          text = this.cleanText(wordResult.value);
          break;

        case '.xls':
        case '.xlsx':
          const workbook = xlsx.read(await fs.readFile(file.path));
          text = workbook.SheetNames.map(name => {
            const sheet = workbook.Sheets[name];
            return `[Sheet: ${name}]\n${xlsx.utils.sheet_to_csv(sheet)}`;
          }).join('\n\n');
          text = this.cleanText(text);
          break;

        case '.txt':
          text = await fs.readFile(file.path, 'utf-8');
          text = this.cleanText(text);
          break;

        case '.csv':
          text = await this.processCSVInChunks(file.path);
          break;

        default:
          throw new Error('Unsupported file type');
      }

      await fs.unlink(file.path);
      return text;
      
    } catch (error) {
      console.error(`Error processing file ${file.originalname}:`, error);
      await fs.unlink(file.path).catch(console.error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();
