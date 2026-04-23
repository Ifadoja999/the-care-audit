import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI training crawlers: explicitly disallowed
      { userAgent: 'GPTBot', disallow: ['/'] },
      { userAgent: 'CCBot', disallow: ['/'] },
      { userAgent: 'anthropic-ai', disallow: ['/'] },
      { userAgent: 'Google-Extended', disallow: ['/'] },
      { userAgent: 'FacebookBot', disallow: ['/'] },
      { userAgent: 'PerplexityBot', disallow: ['/'] },
      { userAgent: 'Bytespider', disallow: ['/'] },
      { userAgent: 'PetalBot', disallow: ['/'] },
      { userAgent: 'DataForSeoBot', disallow: ['/'] },
      { userAgent: 'AhrefsBot', disallow: ['/'] },
      { userAgent: 'SemrushBot', disallow: ['/'] },
      { userAgent: 'MJ12bot', disallow: ['/'] },
      { userAgent: 'DotBot', disallow: ['/'] },
      // All other crawlers: allow with crawl delay
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
        crawlDelay: 10,
      },
    ],
    sitemap: 'https://www.thecareaudit.com/sitemap-index.xml',
  };
}
