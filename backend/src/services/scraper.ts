import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchArticleText(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000, // 10 second timeout
    });

    const $ = cheerio.load(response.data);

    // Remove script, style, and navigation elements
    $('script, style, nav, header, footer, iframe, noscript').remove();

    // Try to find the main content using common article selectors
    const contentSelectors = [
      'article',
      '[role="article"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '.content',
    ];

    let articleText = '';

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        articleText = element.text();
        break;
      }
    }

    // Fallback to body if no article content found
    if (!articleText) {
      articleText = $('body').text();
    }

    // Clean up the text
    articleText = articleText
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();

    if (!articleText || articleText.length < 100) {
      throw new Error('Could not extract sufficient text from URL');
    }

    // Limit text length to prevent token overflow (approximately 10,000 words)
    const maxLength = 50000;
    if (articleText.length > maxLength) {
      articleText = articleText.substring(0, maxLength);
    }

    return articleText;
  } catch (error: any) {
    console.error('Error fetching article:', error);
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw new Error('Could not reach the provided URL');
    }
    throw new Error('Failed to fetch article content from URL');
  }
}
