declare module 'csv-parser' {
  import { Transform } from 'stream';
  
  interface CsvParserOptions {
    headers?: boolean | string[];
    separator?: string;
    skipLines?: number;
    strict?: boolean;
  }

  function csvParser(options?: CsvParserOptions): Transform;
  
  export = csvParser;
} 