import express, { Request, Response } from 'express'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import {
  RESTError,
  RESTGetAPICurrentUserGuildsResult, RESTGetAPIUserResult,
  RESTPostOAuth2AccessTokenResult,
  RouteBases,
  Routes
} from 'discord-api-types/v10'
import { User, Nullable } from './shared/types.js'
import { logging } from './utilities/logging.js'
import { findDominantColor, preventSimilarColor } from './utilities/colors.js'
import { createWebSocketServer } from './websocketServer.js'
import 'dotenv/config'

const app = express()

const isProduction = process.env.NODE_ENV === 'production'

const port = Number(process.env.PORT ?? 8080)
const origin = process.env.PUBLIC_ORIGIN ?? 'http://localhost'
const hostname = new URL(origin).hostname
const clientHostname = `clients.${hostname}`

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Validate URLs
app.use((req, res, next) => {
  try {
    decodeURIComponent(req.path)
  } catch {
    logging.error('Error decoding URL: ' + req.path.toString())
    return res.redirect(origin)
  }
  next()
})

app.use(compression())

// Distribute folder
app.use(express.static(path.resolve(__dirname, '../dist/'), { index: false, maxAge: 86400 }))

// Cookies
app.use(cookieParser())

// Security headers
app.use((_, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    'default-src \'self\'; ' +
    'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; ' +
    'style-src \'self\' \'unsafe-inline\' fonts.googleapis.com; ' +
    'font-src \'self\' fonts.gstatic.com; ' +
    'img-src \'self\' data: *; ' +
    'connect-src \'self\'; ' +
    'frame-src \'self\''
  )
  next()
})

// Endpoints
// Login endpoint
const generateRandomString = () => {
  let randomString = ''
  const randomNumber = Math.floor(Math.random() * 10)
  for (let i = 0; i < 20 + randomNumber; i++) {
    randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94))
  }
  return randomString
}
const redirectWithError = (res: Response, error: string) => {
  res.redirect(`/?error=${encodeURIComponent(error)}`)
}
app.get('/login', (req: Request, res: Response) => {
  const loginUrl = new URL('https://discordapp.com/api/oauth2/authorize?client_id=1053262351803093032&scope=identify%20guilds&response_type=code')
  loginUrl.searchParams.set('redirect_uri', `${origin}/auth`)
  const state = generateRandomString()
  loginUrl.searchParams.set('state', state)
  res.cookie('oauth_state', state, { httpOnly: false, secure: true, sameSite: 'lax' })
  res.cookie('redirect_uri', req.headers.referer ?? '/', { httpOnly: true, secure: true, sameSite: 'lax' })
  res.redirect(loginUrl.toString())
})

// Logout
app.get('/logout', (req: Request, res: Response) => {
  const oauthToken = req.cookies.oauth_token as string | undefined
  const refreshToken = req.cookies.refresh_token as string | undefined
  if (oauthToken || refreshToken) {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      logging.error('[OAuth Req] Client ID or secret not set. OAuth will fail.')
      return redirectWithError(res, 'Invalid OAuth configuration')
    }
    void fetch(RouteBases.api + Routes.oauth2TokenRevocation(), {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        token: oauthToken ? oauthToken.split(' ')[1] : refreshToken ?? '',
        token_type_hint: oauthToken ? 'access_token' : 'refresh_token'
      }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then((response) => response.json()).then(console.log)
  }
  res.clearCookie('oauth_state')
  res.clearCookie('redirect_uri')
  res.clearCookie('oauth_token')
  res.clearCookie('refresh_token')
  res.clearCookie('csrf_token')
  res.redirect('/?logout')
})

// Authentication endpoint
const fetchToken = async (res: Response, bodyInit: Record<string, string>) => {
  if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    logging.error('[OAuth Req] Client ID or secret not set. OAuth will fail.')
    return { status: 500, error: 'Invalid OAuth configuration' }
  }

  const token = await fetch(RouteBases.api + Routes.oauth2TokenExchange(), {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      ...bodyInit
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
    .then((response) => response.json() as Promise<RESTPostOAuth2AccessTokenResult | RESTError>)
    .then((response) => 'message' in response ? { status: 502, error: response.message } : response)
    .catch(() => ({ status: 504, error: 'Discord API is unreachable' }))

  if ('access_token' in token) {
    res.cookie(
      'oauth_token',
      `${token.token_type} ${token.access_token}`,
      { httpOnly: true, secure: true, sameSite: 'strict', maxAge: token.expires_in * 1000 }
    )
    res.cookie(
      'refresh_token',
      token.refresh_token,
      { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 28 * 86400 * 1000 }
    )
    res.cookie(
      'csrf_token',
      generateRandomString(),
      { httpOnly: false, secure: true, sameSite: 'strict', maxAge: token.expires_in * 1000 }
    )
  }
  return token
}
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.get('/auth', async (req: Request, res: Response) => {
  const { code, state, error_description } = req.query
  const originalState = req.cookies.oauth_state as string | undefined
  const redirectUri = req.cookies.redirect_uri as string | undefined

  if (typeof error_description === 'string') {
    return redirectWithError(res, error_description)
  }
  if (!state || state !== originalState) {
    return redirectWithError(res, 'Invalid OAuth state parameter')
  }
  if (typeof code !== 'string') {
    return redirectWithError(res, 'Unknown authentication error')
  }

  const token = await fetchToken(res, {
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: `${origin}/auth`
  })
  if ('error' in token) {
    return redirectWithError(res, 'Failed to fetch token: ' + token.error)
  }

  res.clearCookie('oauth_state')
  res.clearCookie('redirect_uri')
  res.redirect(redirectUri ?? '/')
})

// APIs
// User
let devUserCache: Nullable<User> = null
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.get('/api/user', express.json(), async (req: Request, res) => {
  const oauthToken = req.cookies.oauth_token as string | undefined
  const refreshToken = req.cookies.refresh_token as string | undefined
  const csrfTokenCookie = req.cookies.csrf_token as string | undefined
  const csrfTokenHeader = req.headers['X-CSRF-Token'] as string | undefined

  let authorizationToken = oauthToken
  if (!authorizationToken) {
    if (refreshToken) {
      const token = await fetchToken(res, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
      if ('error' in token) {
        return res.status(token.status).json({ error: token.error })
      }

      authorizationToken = `${token.token_type} ${token.access_token}`
    } else {
      return res.status(401).json({ error: 'OAuth token missing' }) // Unauthorized
    }
  }
  if (csrfTokenHeader && csrfTokenCookie !== decodeURIComponent(csrfTokenHeader)) {
    return res.status(403).json({ error: 'CSRF token does not match' }) // Forbidden
  }

  if (devUserCache) { return res.json(devUserCache) }

  const userResponse = await fetch(RouteBases.api + Routes.user(), {
    method: 'GET',
    headers: { authorization: authorizationToken }
  })
    .then((response) => response.json() as Promise<RESTGetAPIUserResult | RESTError>)
    .then((response) => 'message' in response ? { status: 502, error: response.message } : response)
    .catch(() => ({ status: 504, error: 'Discord API is unreachable' }))
  if ('error' in userResponse) {
    return res.status(userResponse.status).json({ error: userResponse.error })
  }

  const guildsResponse = await fetch(RouteBases.api + Routes.userGuilds(), {
    method: 'GET',
    headers: { authorization: authorizationToken }
  })
    .then((response) => response.json() as Promise<RESTGetAPICurrentUserGuildsResult | RESTError>)
    .then((response) => 'message' in response ? { status: 502, error: response.message } : response)
    .catch(() => ({ status: 504, error: 'Discord API is unreachable' }))
  if ('error' in guildsResponse) {
    return res.status(guildsResponse.status).json({ error: guildsResponse.error })
  }

  const user: User = Object.assign(userResponse, { guilds: guildsResponse })
  if (!isProduction) { devUserCache = user }
  res.json(user)
})

// Colors
const colors: Record<string, string> = {}
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.post('/api/colors', express.json(), async (req: Request<never, { color: string }, { url: string, preventSimilar?: string }>, res) => {
  if (!req.body.url?.endsWith('.jpg') && !req.body.url?.endsWith('.png')) { return res.status(400).end() }
  const color = colors[req.body.url] ?? await findDominantColor(req.body.url)
  colors[req.body.url] = color
  const notDark = preventSimilarColor(color, '#121212', true)
  const corrected = preventSimilarColor(notDark, req.body.preventSimilar ?? '#121212', true)
  res.send({ color: corrected })
})

// Main endpoint
app.get('/{*splat}', (req, res) => {
  console.log(req.hostname, clientHostname)
  if (req.hostname === clientHostname) { return res.redirect(origin) }
  res.sendFile(path.resolve(__dirname, '../dist/index.html'))
})

const server = createServer(app)

server.listen({ port: port }, () => {
  logging.success(`Started server on port ${port}.`)
})

const wsServer = createWebSocketServer(hostname)

server.on('upgrade', (request, socket, head) => {
  console.log(request.headers)
  if (request.headers.origin === origin || request.headers.host === clientHostname) {
    return wsServer.handleUpgrade(request, socket, head, (socket) => {
      wsServer.emit('connection', socket, request)
    })
  }
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
  socket.destroy()
})
