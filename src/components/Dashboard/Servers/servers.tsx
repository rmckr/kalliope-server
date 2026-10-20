import React, { useEffect, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import { CaretUp, DiscordLogo } from '@phosphor-icons/react'
import { RESTAPIPartialCurrentUserGuild } from 'discord-api-types/v10'
import { GuildClientMapType, Nullable, PlayerListType } from '../../../../shared/types'
import useWebSocket from '../../../hooks/webSocketHook'
import Visualizer from '../Vizualizer/visualizer'
import genericServer from '../../../assets/generic_server.png'
import 'react-loading-skeleton/dist/skeleton.css'
import './servers.scss'

function LoadingServerIcon({ guild }: { guild?: Nullable<RESTAPIPartialCurrentUserGuild> }) {
  const [isLoaded, setLoaded] = useState(false)
  return (
    <>
      <img
        src={guild?.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}` : genericServer}
        className={'server-logo'}
        alt={'Server Icon'}
        onError={(event) => { event.currentTarget.src = genericServer }}
        onLoad={guild?.icon ? () => setLoaded(true) : undefined}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
      {!isLoaded && <Skeleton className={'server-logo'} containerClassName={'skeleton'}/>}
    </>
  )
}

export type ServersProps = {
  guildClientMap: Nullable<GuildClientMapType>,
  playerList: Nullable<PlayerListType>,
  userGuilds: Nullable<RESTAPIPartialCurrentUserGuild[]>,
  guildId: Nullable<string>,
  setGuildId: (id: string) => void
}

export default function Servers({ guildClientMap, playerList, userGuilds, guildId, setGuildId }: ServersProps) {
  const webSocket = useWebSocket()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = window.matchMedia('screen and (max-width: 768px)').matches

  useEffect(() => {
    if (webSocket?.readyState === 1) {
      // Always ask for new playerList in order to allow server to update this connection
      webSocket.request({ type: 'requestPlayerList' })
    } else {
      webSocket?.addEventListener('open', () => {
        webSocket.request({ type: 'requestPlayerList' })
      }, { once: true })
    }
  }, [webSocket])
  useEffect(() => {
    if (!webSocket) { return }
    if (!guildClientMap) {
      if (webSocket.readyState === 1) {
        void new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
          webSocket.request({ type: 'requestGuildClientMap' })
        })
      } else {
        webSocket.addEventListener('open', () => {
          void new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
            webSocket.request({ type: 'requestGuildClientMap' })
          })
        }, { once: true })
      }
    }
  }, [webSocket, guildClientMap])

  const commonGuilds = userGuilds?.filter((guild) => Object.keys(guildClientMap ?? {}).includes(guild.id)) ?? []

  return (
    <div className={`server-container ${collapsed ? 'collapsed' : ''} flex-container column start nowrap`}>
      <div className={'server-title-container flex-container space-between nowrap'}>
        <div className={'flex-container nowrap'}>
          <DiscordLogo/>
          <h5 className={'server-title'}>Your Servers</h5>
        </div>
        {isMobile && <button onClick={() => setCollapsed(!collapsed)}><CaretUp style={collapsed ? { rotate: '180deg' } : undefined}/></button>}
      </div>

      {(!userGuilds || !guildClientMap) && Array.from({ length: isMobile ? 3 : 6 }).map((_, index) => (
        <div key={index} className={'server-item flex-container nowrap'}>
          <LoadingServerIcon/>
          <div className={'server-item-text flex-container space-between nowrap'}>
            <Skeleton containerClassName={'skeleton'} width={[100, 50, 200][index % 3]} style={{ maxWidth: '100%' }}/>
          </div>
        </div>
      ))}

      {guildClientMap && commonGuilds.length === 0 && (
        <div className={'flex-container'} style={{ width: '100%' }}>
          <p>You have no servers in common with any instance of Kalliope.<br/>{'Host your own instance now using the '}<a href={'https://github.com/MeridianGH/kalliope#installation'} className={'underline'}>instructions</a>{' and make sure it\'s properly configured.'}</p>
        </div>
      )}

      {guildClientMap && commonGuilds.map((guild, index) => (
        <div
          key={index}
          className={`server-item ${guildId === guild.id ? 'active' : ''} ${playerList?.has(guild.id) ? 'playing' : ''} flex-container nowrap`}
          onClick={() => { setGuildId(guild.id) }}
        >
          <LoadingServerIcon guild={guild}/>
          <div className={'server-item-text flex-container space-between nowrap'}>
            <span>{guild.name}</span>
            {playerList?.has(guild.id) && <Visualizer style={'white'}/>}
          </div>
        </div>
      ))}
    </div>
  )
}
