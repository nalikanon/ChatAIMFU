import axios from 'axios';
import * as cheerio from 'cheerio';

export class WebScraperService {
  async scrapeUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // ลบ elements ที่ไม่ต้องการ
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();
      $('header').remove();
      
      // ดึงเนื้อหาที่ต้องการ
      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
      
      return content;
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
      throw error;
    }
  }

  async scrapeUrls(urls: string[]): Promise<Array<{url: string, content: string}>> {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const content = await this.scrapeUrl(url);
          return { url, content };
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
          return { url, content: '' };
        }
      })
    );
    return results.filter(result => result.content);
  }
}

export const webScraperService = new WebScraperService(); 