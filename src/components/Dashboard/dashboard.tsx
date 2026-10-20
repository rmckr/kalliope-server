import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import Skeleton from 'react-loading-skeleton'
import { IconContext, SignOut } from '@phosphor-icons/react'
import {
  SiBandcamp, SiBandcampHex,
  SiSoundcloud, SiSoundcloudHex,
  SiSpotify, SiSpotifyHex,
  SiTwitch, SiTwitchHex,
  SiVimeo, SiVimeoHex,
  SiYoutube, SiYoutubeHex
} from '@icons-pack/react-simple-icons'
import { GuildClientMapType, MessageToUser, Nullable, Player, PlayerListType } from '../../../shared/types'
import useDiscordLogin from '../../hooks/discordLoginHook'
import useWebSocket from '../../hooks/webSocketHook'
import useMediaSession from '../../hooks/mediaSessionHook'
import usePageTitle from '../../hooks/pageTitleHook'
import Background from '../Background/background'
import PlayerBar from './PlayerBar/playerbar'
import Servers from './Servers/servers'
import Queue from './Queue/queue'
import Controls from './Controls/controls'
import kalliopeTransparentPNG from '../../assets/kalliope_transparent.png'
import 'react-loading-skeleton/dist/skeleton.css'
import './dashboard.scss'

export default function Dashboard() {
  usePageTitle('Kalliope. | Dashboard')
  const user = useDiscordLogin()
  const webSocket = useWebSocket()
  const [guildClientMap, setGuildClientMap] = useState<Nullable<GuildClientMapType>>(null)
  const [playerList, setPlayerList] = useState<Nullable<PlayerListType>>(null)
  const [guildId, setGuildId] = useState<Nullable<string>>(null)
  const [player, setPlayer] = useState<Nullable<Player>>(null)
  useMediaSession(player?.guildId, player?.queue.current, player?.paused)

  useEffect(() => {
    if (!webSocket || !guildId) { return }
    webSocket.request({ type: 'requestPlayerData', guildId: guildId })
  }, [guildId, webSocket])

  // WebSocket Effect
  useEffect(() => {
    if (!webSocket) { return }

    function onMessage(message: MessageEvent<string>) {
      const data = JSON.parse(message.data) as MessageToUser
      if (import.meta.env.DEV) { console.log('client received:', data) }
      switch (data.type) {
        case 'guildClientMap':
          setGuildClientMap(data.map)
          break
        case 'playerList':
          setPlayerList(new Set(data.list))
          break
        case 'playerData':
          setPlayer(data.player)
          break
        case 'error':
          if (data.requestId) { break } // Assume error will be handled in original request
          toast.error(data.errorMessage)
          break
      }
    }

    function onClose() {
      setGuildClientMap(null)
      setPlayerList(null)
      setGuildId(null)
      setPlayer(null)
    }

    webSocket.addEventListener('message', onMessage)
    webSocket.addEventListener('close', onClose)

    return () => {
      webSocket.removeEventListener('message', onMessage)
      webSocket.removeEventListener('close', onClose)
    }
  }, [webSocket])

  return (
    <IconContext.Provider value={{ size: '1.5rem' }}>
      <div className={'dashboard'}>
        <Background style={'transparent'}/>
        <div className={'dashboard-header flex-container space-between nowrap'}>
          <Link to={'/'} className={'dashboard-header-title flex-container'}>
            <img src={kalliopeTransparentPNG} alt={'Logo'}/>
            <span>Kalliope.</span>
          </Link>
          <div className={'dashboard-header-links flex-container nowrap'}>
            <a href={'https://youtube.com'} title={'YouTube'} style={{ backgroundColor: SiYoutubeHex }} rel={'noreferrer'} target={'_blank'}>
              <SiYoutube size={'1rem'}/>
            </a>
            <a href={'https://spotify.com'} title={'Spotify'} style={{ backgroundColor: SiSpotifyHex }} rel={'noreferrer'} target={'_blank'}>
              <SiSpotify size={'1rem'}/>
            </a>
            <a href={'https://twitch.tv'} title={'Twitch'} style={{ backgroundColor: SiTwitchHex }} rel={'noreferrer'} target={'_blank'}>
              <SiTwitch size={'1rem'}/>
            </a>
            <a href={'https://soundcloud.com'} title={'SoundCloud'} style={{ backgroundColor: SiSoundcloudHex }} rel={'noreferrer'} target={'_blank'}>
              <SiSoundcloud size={'1rem'}/>
            </a>
            <a href={'https://bandcamp.com'} title={'Bandcamp'} style={{ backgroundColor: SiBandcampHex }} rel={'noreferrer'} target={'_blank'}>
              <SiBandcamp size={'1rem'}/>
            </a>
            <a href={'https://vimeo.com'} title={'Vimeo'} style={{ backgroundColor: SiVimeoHex }} rel={'noreferrer'} target={'_blank'}>
              <SiVimeo size={'1rem'}/>
            </a>
          </div>
          <div className={'dashboard-header-user-container flex-container'}>
            <div className={'dashboard-header-user flex-container nowrap'}>
              {user ? <span>{user.global_name}</span> : <Skeleton width={'5rem'} containerClassName={'skeleton'}/>}
              {user ? <img className={'dashboard-header-icon'} src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`} alt={'Avatar'}/> : <Skeleton height={'2rem'} width={'2rem'} circle={true} containerClassName={'skeleton'}/>}
              <a href={'/logout'} title={'Logout'} className={'dashboard-header-logout flex-container nowrap'}>
                <SignOut weight={'bold'}/>
                Logout
              </a>
            </div>
          </div>
        </div>
        <Servers guildClientMap={guildClientMap} playerList={playerList} userGuilds={user?.guilds} guildId={guildId} setGuildId={setGuildId}/>
        <Queue guildId={guildId} tracks={player?.queue.tracks}/>
        <Controls guildId={guildId} filter={player?.filters.current} hasPlayer={!!player}/>
        <PlayerBar
          guildId={guildId}
          current={player?.queue.current}
          position={player?.position}
          volume={player?.volume}
          timescale={player?.filters.timescale}
          paused={player?.paused}
          repeatMode={player?.repeatMode}
          settings={player?.settings}
        />
      </div>
    </IconContext.Provider>
  )
}
