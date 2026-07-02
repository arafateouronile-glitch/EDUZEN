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
  // Inclure le CERFA PDF dans le bundle de la fonction serverless Vercel
  outputFileTracingIncludes: {
    '/api/bpf/export-pdf': ['./public/cerfa/**'],
  },
  // jsdom et ses dépendances (html-encoding-sniffer → @exodus/bytes ESM) doivent rester
  // en tant que packages externes côté serveur pour que Node.js gère l'ESM correctement.
  serverExternalPackages: ['canvas'],
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
      {
        source: '/comparatif',
        destination: '/comparatif/index.html',
      },
      {
        source: '/comparatif/:slug',
        destination: '/comparatif/:slug.html',
      },
      {
        source: '/pour',
        destination: '/pour/index.html',
      },
      {
        source: '/pour/:slug',
        destination: '/pour/:slug.html',
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
          // Content Security Policy - Entièrement gérée par le middleware (middleware-i18n.ts)
          // via getSecurityHeadersWithNonce() : CSP stricte avec nonce par requête.
          // Ce fichier statique ne définit pas de CSP car le middleware couvre toutes les routes HTML.
          // Les assets statiques (_next/static, _next/image) n'ont pas besoin de CSP.
        ],
      },
      {
        // API v1 publique : autoriser les appels cross-origin (sites WordPress, apps externes)
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, X-Eduzen-API-Key, X-API-Key, Authorization' },
          { key: 'Access-Control-Max-Age',       value: '86400' },
          // Écraser CORP same-origin (défini dans le bloc global) pour autoriser cross-origin
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // VSL landing pages : COEP relâché pour autoriser les iframes YouTube.
        // Doit être listé APRÈS /:path* pour que ses valeurs écrasent celles du bloc général.
        source: '/vsl/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Studio e-learning : COEP relâché pour autoriser les iframes YouTube/Vimeo dans les blocs média.
        source: '/dashboard/elearning/courses/:slug/edit',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Page learner e-learning : COEP relâché pour l'iframe SCORM.
        source: '/learner/elearning/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        // Route proxy content SCORM : autoriser l'embedding depuis la même app.
        source: '/api/elearning/scorm/content/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ]
  },
  // Configuration pour Puppeteer
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Puppeteer nécessite certaines configurations côté serveur
      // Ne pas externaliser framer-motion car il est utilisé dans les composants
      config.externals = [...(config.externals || []), 'canvas']
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
