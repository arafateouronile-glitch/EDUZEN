#!/usr/bin/env node

/**
 * Serveur WebSocket pour la collaboration en temps réel avec Yjs
 * Compatible avec y-websocket client
 * 
 * Ce serveur utilise une approche simplifiée pour le développement.
 * Pour la production, utilisez un serveur dédié ou Supabase Realtime.
 */

const http = require('http')
const { WebSocketServer } = require('ws')

const PORT = process.env.WS_PORT || 1234
const HOST = process.env.WS_HOST || '0.0.0.0' // Écouter sur toutes les interfaces

// Créer un serveur HTTP
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('WebSocket server for Yjs collaboration\n')
})

// Créer le serveur WebSocket
const wss = new WebSocketServer({ 
  server,
  perMessageDeflate: false
})

// Stocker les connexions par room
const rooms = new Map()

wss.on('connection', (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`)
  const room = url.pathname.substring(1) // Enlever le premier '/'
  
  console.log(`[${new Date().toISOString()}] ✅ New WebSocket connection to room: ${room}`)
  console.log(`    Client IP: ${request.socket.remoteAddress}`)
  
  // Initialiser la room si elle n'existe pas
  if (!rooms.has(room)) {
    rooms.set(room, new Set())
  }
  const roomClients = rooms.get(room)
  roomClients.add(ws)
  
  // Gérer les messages - relay binaire pour Yjs
  ws.on('message', (message) => {
    try {
      // Diffuser le message binaire à tous les clients dans la même room (y compris l'expéditeur pour la synchronisation)
      // y-websocket utilise des messages binaires pour la synchronisation Yjs
      roomClients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          // Envoyer le message tel quel (Buffer ou ArrayBuffer)
          client.send(message)
        }
      })
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error relaying message:`, error.message)
    }
  })
  
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket connection closed for room: ${room}`)
    roomClients.delete(ws)
    
    // Nettoyer la room si elle est vide
    if (roomClients.size === 0) {
      rooms.delete(room)
      console.log(`[${new Date().toISOString()}] Room ${room} cleaned up`)
    }
  })
  
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, error.message)
    roomClients.delete(ws)
  })
  
  // Ne pas envoyer de message de bienvenue - y-websocket gère sa propre synchronisation
})

// Démarrer le serveur
server.listen(PORT, HOST, () => {
  console.log(`🚀 WebSocket server for Yjs collaboration running`)
  console.log(`   Listening on: ws://localhost:${PORT} and ws://0.0.0.0:${PORT}`)
  console.log(`   Ready to accept connections for real-time collaboration`)
  console.log(`   Example: ws://localhost:${PORT}/template-{templateId}`)
  console.log(`\n   Server started at ${new Date().toISOString()}\n`)
})

// Gestion des erreurs
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`)
    console.error(`   You can set a different port with: WS_PORT=1235 npm run ws:server`)
    console.error(`   Or kill the process: lsof -ti:${PORT} | xargs kill -9`)
  } else {
    console.error('❌ Server error:', error)
  }
  process.exit(1)
})

// Gestion de l'arrêt propre
const shutdown = () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  wss.clients.forEach((client) => {
    client.close()
  })
  wss.close(() => {
    server.close(() => {
      console.log('✅ WebSocket server closed')
      process.exit(0)
    })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
