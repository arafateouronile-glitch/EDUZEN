import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/dashboard/',
          '/portal/',
          '/learner/',
          '/api/',
          '/auth/',
          '/_next/',
          '/.well-known/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}


