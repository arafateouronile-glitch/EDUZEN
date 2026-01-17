// Réactiver next-intl pour que le fichier de configuration soit trouvé
const withNextIntl = require('next-intl/plugin')(
  './i18n/request.ts'
)

/** @type {import('next').NextConfig} */
// Bundle analyzer uniquement si disponible (devDependencies) ou si ANALYZE=true
// En production sur Vercel, @next/bundle-analyzer n'est pas installé (devDependencies)
// Donc on le rend vraiment optionnel
let withBundleAnalyzer = (config) => config

// Vérifier si le module est disponible AVANT de l'utiliser
if (process.env.ANALYZE === 'true' || process.env.NODE_ENV === 'development') {
  try {
    const bundleAnalyzer = require('@next/bundle-analyzer')
    withBundleAnalyzer = bundleAnalyzer({
      enabled: process.env.ANALYZE === 'true',
    })
  } catch (e) {
    // Module non disponible, on continue sans (cas production Vercel)
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Optimisation des images
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },
  // Headers de sécurité Elite (complémentaires au middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DNS Prefetch Control - Améliore les performances
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Download Options - Protection IE (legacy mais toujours utile)
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          // Content Type Options - Prévenir MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Frame Options - Protection clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection - Activer le filtre XSS du navigateur
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy - Contrôle des informations envoyées
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy - Désactive features non utilisées
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
          },
          // Cross-Origin-Embedder-Policy - Isolation supplémentaire
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          // Cross-Origin-Opener-Policy - Protection contre attaques cross-origin
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          // Cross-Origin-Resource-Policy - Contrôle partage de ressources
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Strict Transport Security (uniquement en production avec HTTPS)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload', // 2 ans pour preload
                },
              ]
            : []),
          // Content Security Policy - Protection contre XSS et injection
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.sentry.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
              "frame-src 'self' https://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Configuration pour Puppeteer
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Puppeteer nécessite certaines configurations côté serveur
      // Ne pas externaliser framer-motion car il est utilisé dans les composants
      config.externals = [...(config.externals || []), 'canvas', 'jsdom']
    }
    // Exclure les fichiers .backup.* du build en utilisant IgnorePlugin
    const webpack = require('webpack')
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.backup\.(ts|tsx|js|jsx)$/,
      })
    )
    // S'assurer que framer-motion est correctement résolu
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    return config
  },
}

// Exporter avec next-intl et bundle-analyzer (chaînage des wrappers)
module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
