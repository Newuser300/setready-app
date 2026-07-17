import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bgready.site';

// Allow normal crawling of public pages, keep private/app routes out of the
// index, and explicitly welcome the major AI crawlers so BGReady can be found
// and cited inside AI assistants (ChatGPT, Claude, Perplexity, Google AI, etc.).
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/api/', '/admin', '/dashboard', '/settings', '/messages', '/auth',
    '/debug-auth', '/json', '/payment-processing', '/profile', '/work-log',
    '/journal', '/voucher-wallet', '/redeem', '/claim',
  ];
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
    'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended',
    'Applebot', 'Applebot-Extended', 'CCBot', 'Amazonbot', 'Meta-ExternalAgent',
    'cohere-ai', 'YouBot', 'DuckAssistBot',
  ];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: aiBots, allow: '/', disallow },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
