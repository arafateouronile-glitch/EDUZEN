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
  // Turbopack (dev Next.js 16+) : stub canvas pour pdfjs-dist côté client (chemin relatif au projet)
  turbopack: {
    resolveAlias: {
      canvas: './lib/stubs/canvas.js',
    },
  },
  // Vérification TypeScript pendant le build désactivée pour accélérer (projet volumineux → phase TS ~30+ min).
  // Lancer « npm run type-check » en CI ou avant une release pour vérifier les types.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'barcode.tec-it.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
    // Optimisation des images
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },
  // Réécriture : en dev (Turbopack), les polices peuvent être demandées sous /assets/ ;
  // les servir depuis _next/static pour éviter 404 (Inter_18pt-*.ttf).
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: '/_next/static/media/:path*',
      },
    ]
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
          // Content Security Policy - Géré dynamiquement par le middleware avec nonces
          // La CSP statique est en mode report-only pour observer sans bloquer
          // Le middleware applique une CSP stricte avec nonces pour chaque requête
          {
            key: 'Content-Security-Policy-Report-Only',
            value: [
              "default-src 'self'",
              // Autoriser unsafe-inline et unsafe-eval pour html2canvas/jsPDF et le hot reload Next.js
              // https://js.stripe.com pour Stripe.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.sentry.io https://unpkg.com https://js.stripe.com",
              "worker-src 'self' blob: https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' blob: https://*.supabase.co https://*.sentry.io wss://*.supabase.co https://api.stripe.com https://*.stripe.com https://*.stripe.network",
              "frame-src 'self' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              // upgrade-insecure-requests retiré : ignoré en report-only (le navigateur l'ignore et affiche un warning)
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
    } else {
      // Côté client, ignorer canvas qui est un module Node.js
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      }
    }
    // Exclure les fichiers .backup.* et .refactored.* du build en utilisant IgnorePlugin
    const webpack = require('webpack')
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.(backup|refactored)\.(ts|tsx|js|jsx)$/,
      })
    )
    // Ignorer canvas côté client (module Node.js uniquement)
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
        })
      )
    }
    // Optimiser framer-motion pour le tree-shaking
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': require.resolve('framer-motion'),
      // Utiliser un stub pour canvas côté client (module Node.js uniquement)
      ...(isServer ? {} : { canvas: require.resolve('./lib/stubs/canvas.ts') }),
    }
    
    // Optimiser les imports de framer-motion pour réduire le bundle
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    }
    
    return config
  },
}

// Exporter avec next-intl et bundle-analyzer (chaînage des wrappers)
module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
