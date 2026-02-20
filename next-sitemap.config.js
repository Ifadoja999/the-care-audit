/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thecareaudit.com',
  generateRobotsTxt: false, // We manage robots.txt manually in public/
  changefreq: 'monthly',
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ['/api/*', '/search'],

  // Facility pages are the most important — bump their priority
  transform: async (config, path) => {
    // State pages
    if (/^\/[a-z-]+$/.test(path)) {
      return { loc: path, changefreq: 'monthly', priority: 0.8, lastmod: new Date().toISOString() };
    }
    // City pages
    if (/^\/[a-z-]+\/[a-z-]+$/.test(path)) {
      return { loc: path, changefreq: 'monthly', priority: 0.7, lastmod: new Date().toISOString() };
    }
    // Facility profile pages
    if (/^\/[a-z-]+\/[a-z-]+\/[a-z-]+/.test(path)) {
      return { loc: path, changefreq: 'monthly', priority: 0.9, lastmod: new Date().toISOString() };
    }
    // Default (homepage, etc.)
    return { loc: path, changefreq: 'weekly', priority: 1.0, lastmod: new Date().toISOString() };
  },
};
