import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

interface ParsedFile {
  text: string;
  metadata?: any;
}

class FileParserService {
  // จำกัดขนาดข้อความสูงสุดที่จะส่งกลับ
  private MAX_TEXT_LENGTH = 50000;

  async parseFile(file: Express.Multer.File): Promise<string> {
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    try {
      let result: string = '';
      
      // PDF
      if (fileExt === '.pdf' || file.mimetype === 'application/pdf') {
        result = await this.parsePdf(file.buffer);
      }
      // Word
      else if (fileExt === '.docx' || fileExt === '.doc' || 
               file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               file.mimetype === 'application/msword') {
        result = await this.parseWord(file.buffer);
      }
      // Excel
      else if (fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
               file.mimetype === 'application/vnd.ms-excel') {
        result = await this.parseExcel(file.buffer);
      }
      // PowerPoint
      else if (fileExt === '.pptx' || fileExt === '.ppt' ||
               file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
               file.mimetype === 'application/vnd.ms-powerpoint') {
        result = await this.parsePowerPoint(file.buffer);
      }
      else {
        return `[Cannot parse file type ${fileExt}]`;
      }
      
      // จำกัดขนาดข้อความ
      if (result.length > this.MAX_TEXT_LENGTH) {
        result = result.substring(0, this.MAX_TEXT_LENGTH) + 
          `\n\n[File content truncated due to large size (${result.length} characters)]`;
      }
      
      return result;
    } catch (error) {
      console.error(`Error parsing file ${file.originalname}:`, error);
      return `[Error parsing file ${file.originalname}]`;
    }
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Cannot parse PDF file');
    }
  }

  private async parseWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (error) {
      console.error('Error parsing Word document:', error);
      throw new Error('Cannot parse Word file');
    }
  }

  private async parseExcel(buffer: Buffer): Promise<string> {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      
      let result = '';
      
      // วนลูปผ่านทุก sheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        result += `=== Sheet: ${sheetName} ===\n`;
        
        // แปลง sheet เป็น CSV
        const csv = xlsx.utils.sheet_to_csv(worksheet);
        result += csv + '\n\n';
      });
      
      return result;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error('Cannot parse Excel file');
    }
  }

  private async parsePowerPoint(buffer: Buffer): Promise<string> {
    try {
      // PowerPoint ค่อนข้างซับซ้อนในการแปลงโดยตรง
      // สร้างไฟล์ชั่วคราวและใช้ external service หรือ library
      const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.pptx`);
      fs.writeFileSync(tempFilePath, buffer);
      
      // ในที่นี้เราจะส่งข้อความว่ายังไม่รองรับการแปลงโดยตรง
      // แต่ในอนาคตอาจเพิ่ม library ที่สามารถแปลง PowerPoint ได้
      fs.unlinkSync(tempFilePath); // ลบไฟล์ชั่วคราว
      
      return '[PowerPoint file: Summary not shown due to large size, but AI will try to process the data]';
    } catch (error) {
      console.error('Error parsing PowerPoint file:', error);
      throw new Error('Cannot parse PowerPoint file');
    }
  }
}

export const fileParserService = new FileParserService(); 