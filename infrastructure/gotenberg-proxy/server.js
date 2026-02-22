/**
 * Proxy Gotenberg : vérifie X-API-Key puis transmet la requête à Gotenberg.
 * À déployer sur Railway devant le service Gotenberg pour sécuriser l'accès.
 *
 * Env : GOTENBERG_SERVICE_URL (ex. http://gotenberg.railway.internal:3000), GOTENBERG_API_KEY
 */
const http = require('http')
const https = require('https')
const { URL } = require('url')

const PORT = parseInt(process.env.PORT || '3000', 10)
const GOTENBERG_SERVICE_URL = (process.env.GOTENBERG_SERVICE_URL || 'http://localhost:3000').replace(/\/$/, '')
const API_KEY = process.env.GOTENBERG_API_KEY

if (!API_KEY) {
  console.error('GOTENBERG_API_KEY is required')
  process.exit(1)
}

function proxyRequest(req, res) {
  const targetUrl = new URL(req.url || '/', GOTENBERG_SERVICE_URL)
  const isHttps = targetUrl.protocol === 'https:'
  const lib = isHttps ? https : http

  const headers = { ...req.headers }
  delete headers.host
  headers.host = targetUrl.host

  const proxyReq = lib.request(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (isHttps ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message)
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad Gateway')
  })
  req.pipe(proxyReq)
}

const server = http.createServer((req, res) => {
  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    res.writeHead(401, { 'Content-Type': 'text/plain' })
    res.end('Unauthorized')
    return
  }
  proxyRequest(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Gotenberg proxy listening on port ${PORT}, forwarding to ${GOTENBERG_SERVICE_URL}`)
})
