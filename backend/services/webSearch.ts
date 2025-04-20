import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebSearchService {
  private readonly SEARCH_ENGINES = [
    'https://duckduckgo.com/html/',
    'https://www.bing.com/search'
  ];
  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  async searchWeb(query: string): Promise<string> {
    try {
      // สุ่มเลือก search engine
      const searchUrl = this.SEARCH_ENGINES[0]; // เริ่มด้วย DuckDuckGo
      
      const response = await axios.get(searchUrl, {
        params: { q: query },
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html',
          'Accept-Language': 'en-US,en;q=0.9,th;q=0.8'
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      let results: string[] = [];

      // Parser สำหรับ DuckDuckGo
      $('.result').each((i, element) => {
        if (i < 5) { // จำกัดแค่ 5 ผลลัพธ์
          const title = $(element).find('.result__title').text().trim();
          const snippet = $(element).find('.result__snippet').text().trim();
          const link = $(element).find('.result__url').text().trim();
          
          if (title && snippet) {
            results.push(`[${title}]\n${snippet}\nSource: ${link}\n`);
          }
        }
      });

      return results.join('\n');
    } catch (error) {
      console.error('Web search error:', error);
      return '';
    }
  }

  // เพิ่มฟังก์ชันสำหรับดึงข้อมูลจากเว็บไซต์โดยตรง
  async scrapeWebContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent()
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      
      // ลบ elements ที่ไม่จำเป็น
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();
      $('header').remove();
      $('aside').remove();
      
      // ดึงเนื้อหาหลัก
      const content = $('main, article, .content, #content, .main-content')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      return content.substring(0, 2000); // จำกัดความยาว
    } catch (error) {
      console.error('Web scraping error:', error);
      return '';
    }
  }
}

export const webSearchService = new WebSearchService(); 