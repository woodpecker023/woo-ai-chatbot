/**
 * Website Crawler Service
 * Fetches and extracts text content from URLs
 */

export interface CrawlResult {
  success: boolean;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  wordCount?: number;
  error?: string;
}

interface ExtractedContent {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  listItems: string[];
}

/**
 * Crawl a URL and extract text content
 */
export async function crawlUrl(url: string): Promise<CrawlResult> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    // Validate URL
    const parsedUrl = new URL(normalizedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { success: false, url: normalizedUrl, error: 'Invalid URL protocol' };
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WooAI-Bot/1.0; +https://wooai.app/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        url: normalizedUrl,
        error: `Failed to fetch: HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return {
        success: false,
        url: normalizedUrl,
        error: 'URL does not return HTML content',
      };
    }

    const html = await response.text();
    const extracted = extractContent(html);
    const content = buildContentString(extracted);

    return {
      success: true,
      url: normalizedUrl,
      title: extracted.title,
      description: extracted.description,
      content,
      wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
    };
  } catch (error) {
    const err = error as Error;

    if (err.name === 'AbortError') {
      return { success: false, url: normalizedUrl, error: 'Request timed out' };
    }

    return {
      success: false,
      url: normalizedUrl,
      error: err.message || 'Failed to crawl URL',
    };
  }
}

/**
 * Crawl multiple pages from a website (homepage + linked pages)
 */
export async function crawlWebsite(url: string, maxPages: number = 5): Promise<{
  success: boolean;
  pages: CrawlResult[];
  totalWordCount: number;
  error?: string;
}> {
  const visitedUrls = new Set<string>();
  const results: CrawlResult[] = [];

  // Normalize base URL
  let baseUrl = url.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  let parsedBase: URL;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    return { success: false, pages: [], totalWordCount: 0, error: 'Invalid URL' };
  }

  // Start with homepage
  const urlsToVisit: string[] = [baseUrl];

  while (urlsToVisit.length > 0 && results.length < maxPages) {
    const currentUrl = urlsToVisit.shift()!;

    // Skip if already visited
    const normalizedCurrent = normalizeUrl(currentUrl);
    if (visitedUrls.has(normalizedCurrent)) continue;
    visitedUrls.add(normalizedCurrent);

    // Crawl the page
    const result = await crawlUrl(currentUrl);
    results.push(result);

    if (result.success && results.length < maxPages) {
      // Extract links from the page for further crawling
      try {
        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WooAI-Bot/1.0)',
          },
        });
        const html = await response.text();
        const links = extractLinks(html, parsedBase);

        // Add unvisited links to queue (prioritize important pages)
        for (const link of links) {
          const normalizedLink = normalizeUrl(link);
          if (!visitedUrls.has(normalizedLink) && !urlsToVisit.includes(link)) {
            urlsToVisit.push(link);
          }
        }
      } catch {
        // Ignore link extraction errors
      }
    }
  }

  const successfulPages = results.filter(r => r.success);
  const totalWordCount = successfulPages.reduce((sum, r) => sum + (r.wordCount || 0), 0);

  return {
    success: successfulPages.length > 0,
    pages: results,
    totalWordCount,
    error: successfulPages.length === 0 ? 'Failed to crawl any pages' : undefined,
  };
}

/**
 * Extract text content from HTML
 */
function extractContent(html: string): ExtractedContent {
  // Remove script and style tags
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';

  // Extract meta description
  const descMatch = cleaned.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    cleaned.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? decodeHtmlEntities(descMatch[1].trim()) : '';

  // Extract headings
  const headings: string[] = [];
  const headingRegex = /<h[1-6][^>]*>([^<]*(?:<[^/h][^>]*>[^<]*)*)<\/h[1-6]>/gi;
  let match;
  while ((match = headingRegex.exec(cleaned)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text.length > 0) {
      headings.push(decodeHtmlEntities(text));
    }
  }

  // Extract paragraphs
  const paragraphs: string[] = [];
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = paraRegex.exec(cleaned)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text.length > 20) { // Only meaningful paragraphs
      paragraphs.push(decodeHtmlEntities(text));
    }
  }

  // Extract list items
  const listItems: string[] = [];
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = liRegex.exec(cleaned)) !== null) {
    const text = stripTags(match[1]).trim();
    if (text.length > 5) {
      listItems.push(decodeHtmlEntities(text));
    }
  }

  // If no paragraphs found, try to extract from main/article/div
  if (paragraphs.length === 0) {
    const mainMatch = cleaned.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
    if (mainMatch) {
      const text = stripTags(mainMatch[1]).trim();
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      paragraphs.push(...sentences.slice(0, 20).map(s => s.trim()));
    }
  }

  return { title, description, headings, paragraphs, listItems };
}

/**
 * Build a content string from extracted content
 */
function buildContentString(extracted: ExtractedContent): string {
  const parts: string[] = [];

  if (extracted.title) {
    parts.push(`# ${extracted.title}`);
  }

  if (extracted.description) {
    parts.push(`\n${extracted.description}`);
  }

  if (extracted.headings.length > 0) {
    parts.push('\n## Key Topics');
    for (const heading of extracted.headings.slice(0, 20)) {
      parts.push(`- ${heading}`);
    }
  }

  if (extracted.paragraphs.length > 0) {
    parts.push('\n## Content');
    for (const para of extracted.paragraphs.slice(0, 30)) {
      parts.push(para);
    }
  }

  if (extracted.listItems.length > 0) {
    parts.push('\n## Details');
    for (const item of extracted.listItems.slice(0, 30)) {
      parts.push(`- ${item}`);
    }
  }

  return parts.join('\n');
}

/**
 * Extract links from HTML that are on the same domain
 */
function extractLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let match;

  // Priority paths for e-commerce sites
  const priorityPaths = [
    '/about', '/contact', '/faq', '/faqs', '/help',
    '/shipping', '/delivery', '/returns', '/refund',
    '/privacy', '/terms', '/policy', '/policies',
    '/shop', '/products', '/collections', '/categories',
  ];

  const foundLinks: { url: string; priority: number }[] = [];

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      const absoluteUrl = new URL(href, baseUrl.origin);

      // Only same domain
      if (absoluteUrl.hostname !== baseUrl.hostname) continue;

      // Skip non-HTML resources
      if (/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|webp)$/i.test(absoluteUrl.pathname)) continue;

      // Skip admin/cart/checkout pages
      if (/\/(wp-admin|cart|checkout|my-account|login|register)/i.test(absoluteUrl.pathname)) continue;

      const urlStr = absoluteUrl.origin + absoluteUrl.pathname;

      // Check priority
      const priority = priorityPaths.some(p => absoluteUrl.pathname.toLowerCase().includes(p)) ? 1 : 2;
      foundLinks.push({ url: urlStr, priority });
    } catch {
      // Ignore invalid URLs
    }
  }

  // Sort by priority and dedupe
  const seen = new Set<string>();
  for (const link of foundLinks.sort((a, b) => a.priority - b.priority)) {
    if (!seen.has(link.url)) {
      seen.add(link.url);
      links.push(link.url);
    }
    if (links.length >= 20) break;
  }

  return links;
}

/**
 * Strip HTML tags from string
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).toLowerCase().replace(/\/$/, '');
  } catch {
    return url.toLowerCase();
  }
}
