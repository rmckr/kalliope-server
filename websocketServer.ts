import { logging } from './utilities/logging.js'
import { ServerOptions, WebSocket, WebSocketServer } from 'ws'
import {
  ClientDataMapType,
  ClientMessage,
  GuildClientMapType,
  MessageToClient,
  MessageToServer,
  MessageToUser,
  Nullable,
  PlayerListType,
  ServerMessage,
  UserMessage
} from './shared/types.js'
import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

type clientConnectionMapType = Nullable<Record<string, HeartbeatWebSocket>>
type userConnectionByGuildMapType = Nullable<Record<string, Record<string, HeartbeatWebSocket>>>
type requestConnectionMapType = Nullable<Record<string, HeartbeatWebSocket>>

/**
 * A map containing client data organized by clientId.
 * @description Structure: { clientId: { guilds: string[], users: number } }
 */
const clientDataMap: NonNullable<ClientDataMapType> = {}
/**
 * A map containing the single responsible clientId for each guildId.
 * @description Structure: { guildId: clientId }
 */
const guildClientMap: NonNullable<GuildClientMapType> = {}
/**
 * A list containing all guild IDs with active players.
 */
const playerList: NonNullable<PlayerListType> = new Set<string>()
/**
 * A map containing the respective WebSocket object for each clientId.
 * @description Structure: { clientId: ws }
 */
const clientConnectionMap: NonNullable<clientConnectionMapType> = {}
/**
 * A map containing WebSocket objects for each connected user organized by guildId.
 * @description Structure: { guildId: { userId: WebSocket } }
 */
const userConnectionsByGuildMap: NonNullable<userConnectionByGuildMapType> = {}
/**
 * A map containing the respective WebSocket object for each requestId.
 */
const requestConnectionMap: NonNullable<requestConnectionMapType> = {}

class HeartbeatWebSocket extends WebSocket {
  isAlive = false

  constructor(...args: unknown[]) {
    // @ts-expect-error Args are simply passed to parent overload constructors
    super(...args)

    this.on('pong', () => {
      this.isAlive = true
    })

    this.on('error', (error) => {
      logging.error(`[WebSocket] Encountered error: ${error.message}`)
    })
  }

  json<T extends MessageToUser | MessageToClient>(data: T) { return this.send(JSON.stringify(data)) }
}

class HeartbeatWSServer extends WebSocketServer<typeof HeartbeatWebSocket> {
  constructor(options: ServerOptions<typeof HeartbeatWebSocket>) {
    super({ ...options, WebSocket: HeartbeatWebSocket })

    const heartbeat = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          logging.warn('[WebSocket] Peer did not respond to heartbeat in 60s. Terminating WebSocket...')
          return ws.terminate()
        }
        ws.isAlive = false
        ws.ping()
      })
    }, 60 * 1000)
    this.on('close', () => {
      clearInterval(heartbeat)
    })
  }
}

export function createWebSocketServer(hostname: string) {
  const wsServer = new HeartbeatWSServer({ noServer: true })

  wsServer.on('connection', (ws, req) => {
    ws.isAlive = true

    function handleUserMessage(message: UserMessage) {
      if (!message.requestId) {
        return ws.json<ServerMessage>({ requestId: 'none', type: 'error', errorMessage: 'No requestId in request.' })
      }
      if (!message.userId) {
        return ws.json<ServerMessage>({ requestId: message.requestId, type: 'error', errorMessage: 'No userId in request.' })
      }

      const websocketGuildId = 'guildId' in message ? message.guildId : 'noGuild'

      // Store user connection
      Object.keys(userConnectionsByGuildMap).forEach((guildId) => {
        if (websocketGuildId === guildId) { return } // Return acts as continue in forEach
        Object.keys(userConnectionsByGuildMap[guildId]).forEach((userId) => {
          if (message.userId === userId) {
            delete userConnectionsByGuildMap[guildId][userId]
            if (Object.keys(userConnectionsByGuildMap[guildId]).length === 0) {
              delete userConnectionsByGuildMap[guildId]
            }
          }
        })
      })
      userConnectionsByGuildMap[websocketGuildId] = { ...userConnectionsByGuildMap[websocketGuildId], [message.userId]: ws }

      switch (message.type) {
        case 'requestClientDataMap': {
          // Return clientDataMap
          ws.json<ServerMessage>({ requestId: message.requestId, type: 'clientDataMap', map: clientDataMap })
          break
        }
        case 'requestGuildClientMap': {
          // Return guildClientMap
          ws.json<ServerMessage>({ requestId: message.requestId, type: 'guildClientMap', map: guildClientMap })
          break
        }
        case 'requestPlayerList': {
          // Return playerList
          ws.json<ServerMessage>({ requestId: message.requestId, type: 'playerList', list: Array.from(playerList) })
          break
        }
        case 'requestClientData':
        case 'requestPlayerData':
        case 'requestPlayerAction': {
          // Store WebSocket with request ID
          requestConnectionMap[message.requestId] = ws

          // Forward data to client
          const clientId = message.type === 'requestClientData' ? message?.clientId : guildClientMap[websocketGuildId]
          const clientWs = clientConnectionMap[clientId]
          if (!clientWs) {
            ws.json<ServerMessage>({ requestId: message.requestId, type: 'error', errorMessage: 'Could not identify client.' })
            return
          }
          clientWs.json<MessageToClient>(message)
          break
        }
        default: {
          logging.warn(`[WebSocket] Received unknown message: ${JSON.stringify(message)}`)
          break
        }
      }
    }

    function handleClientMessage(message: ClientMessage) {
      if (!message.clientId) { return }

      // if (!isProduction) { console.log('received from client:', data) }
      clientConnectionMap[message.clientId] = ws

      switch (message.type) {
        case 'clientData': {
          // Update clientDataMap and guildClientMap
          let changedGuildClientMap = false
          let changedClientDataMap = false

          if (!message.clientData) {
            delete clientDataMap[message.clientId]
            changedClientDataMap = true

            Object.entries(guildClientMap).forEach(([guildId, clientId]) => {
              if (clientId === message.clientId) {
                delete guildClientMap[guildId]
                changedGuildClientMap = true
              }
            })
          }

          if (message.clientData?.guilds?.length ?? 0 > 0) {
            message.clientData?.guilds.forEach((guildId) => {
              if (guildClientMap[guildId] !== message.clientId) {
                const oldClientId = guildClientMap[guildId]
                guildClientMap[guildId] = message.clientId
                changedGuildClientMap = true
                if (oldClientId !== undefined) { logging.warn(`[WebSocket] Conflict in guildClientMap: Guild ${guildId} changed from clientId ${oldClientId} to ${message.clientId}!`) }
              }
            })
          }

          if (message.clientData && clientDataMap[message.clientId] !== message.clientData) {
            clientDataMap[message.clientId] = message.clientData
            changedClientDataMap = true
          }
          if (changedClientDataMap) {
            Object.values(userConnectionsByGuildMap ?? {}).flatMap((guildEntries) => Object.values(guildEntries))
              .forEach((userWs) => {
                userWs.json<ServerMessage>({ requestId: message.requestId ?? 'none', type: 'clientDataMap', map: clientDataMap })
                if (changedGuildClientMap) {
                  userWs.json<ServerMessage>({ requestId: message.requestId ?? 'none', type: 'guildClientMap', map: guildClientMap })
                }
              })
          }
          break
        }
        case 'playerData': {
          // Update playerList
          const previousSize = playerList.size
          if (message.player) {
            playerList.add(message.guildId)
          } else {
            playerList.delete(message.guildId)
          }
          if (playerList.size !== previousSize) {
            Object.values(userConnectionsByGuildMap ?? {}).flatMap((guildEntries) => Object.values(guildEntries))
              .forEach((userWs) => {
                userWs.json<ServerMessage>({ requestId: 'none', type: 'playerList', list: Array.from(playerList) })
              })
          }

          // Forward playerData to users
          Object.values(userConnectionsByGuildMap[message.guildId] ?? {}).forEach((userWs) => {
            userWs.json<ClientMessage>(message)
          })
          break
        }
        case 'error': {
          if (message.requestId) {
            const userWs = requestConnectionMap[message.requestId]
            userWs.json<ServerMessage>({ requestId: message.requestId, type: 'error', errorMessage: message.errorMessage })
            break
          } else if (message.guildId) {
            Object.values(userConnectionsByGuildMap[message.guildId] ?? {}).forEach((userWs) => {
              userWs.json<ServerMessage>({ requestId: 'none', type: 'error', errorMessage: message.errorMessage })
            })
          }
        }
      }
    }

    ws.on('message', (rawData) => {
      if (!(rawData instanceof Buffer)) { return }
      const message = JSON.parse(rawData.toString()) as MessageToServer

      function isUserMessage(data: MessageToServer): data is UserMessage {
        return data ? req.headers.host === hostname : false
      }

      if (isUserMessage(message)) {
        handleUserMessage(message)
      } else if (req.headers.host === 'clients.' + hostname) {
        handleClientMessage(message)
      }
    })

    ws.on('close', (code, reason) => {
      for (const guildId in userConnectionsByGuildMap) {
        const userId = Object.keys(userConnectionsByGuildMap[guildId]).find((key) => userConnectionsByGuildMap[guildId][key] === ws)
        if (userId) {
          if (!isProduction) { logging.info(`[WebSocket] User websocket closed with reason: ${code} | ${reason.toString() ?? 'Unknown reason'}`) }
          delete userConnectionsByGuildMap[guildId][userId]
          if (Object.keys(userConnectionsByGuildMap[guildId]).length === 0 && guildId !== 'noGuild') {
            delete userConnectionsByGuildMap[guildId]
          }
          return
        }
      }

      const clientId = Object.keys(clientConnectionMap).find((key) => clientConnectionMap[key] === ws)
      if (clientId) {
        if (!isProduction) { logging.info(`[WebSocket] Client connection closed with reason: ${code} | ${reason.toString() ?? 'Unknown reason'}`) }
        delete clientConnectionMap[clientId]
        delete clientDataMap[clientId]
        Object.keys(guildClientMap).forEach((guildId) => {
          if (guildClientMap[guildId] === clientId) { delete guildClientMap[guildId] }
        })
        // eslint-disable-next-line @typescript-eslint/dot-notation
        Object.values(userConnectionsByGuildMap['noGuild'] ?? {}).forEach((userWs) => {
          userWs.json({ requestId: 'none', type: 'guildClientMap', map: guildClientMap })
          userWs.json({ requestId: 'none', type: 'clientDataMap', map: clientDataMap })
        })
      }
    })
  })

  return wsServer
}
