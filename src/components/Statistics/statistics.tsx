import React, { Fragment, useEffect, useState } from 'react'
import { ArrowsClockwise, ChartBar } from '@phosphor-icons/react'
import { ClientDataMapType, MessageToUser, PlayerListType } from '../../../shared/types'
import useWebSocket from '../../hooks/webSocketHook'
import usePageTitle from '../../hooks/pageTitleHook'
import Navbar from '../Navbar/navbar'
import Loader from '../Loader/loader'
import Background from '../Background/background'
import './statistics.scss'

export default function Statistics() {
  usePageTitle('Kalliope. | Statistics')
  const webSocket = useWebSocket()
  const [clientDataMap, setClientDataMap] = useState<ClientDataMapType>(null)
  const [playerList, setPlayerList] = useState<PlayerListType>(new Set())

  useEffect(() => {
    if (!webSocket) { return }

    function onMessage(message: MessageEvent<string>) {
      const data = JSON.parse(message.data) as MessageToUser
      if (import.meta.env.DEV) { console.log('client received:', data) }
      if (data.type === 'clientDataMap') {
        setClientDataMap(data.map)
      } else if (data.type === 'playerList') {
        setPlayerList(new Set(data.list))
      }
    }

    webSocket.request({ type: 'requestClientDataMap' })
    webSocket.request({ type: 'requestPlayerList' })

    webSocket.addEventListener('message', onMessage)

    return () => {
      webSocket.removeEventListener('message', onMessage)
    }
  }, [webSocket])

  const clientData = Object.values(clientDataMap ?? {})

  return (
    <Fragment>
      <Navbar hideOnMobile={false}/>
      <div className={'stats-background-container'}>
        <Background/>
      </div>
      <div className={'stats-container flex-container column'}>
        <div className={'stats-card flex-container column'}>
          <div className={'flex-container nowrap'}>
            <ChartBar size={'3rem'}/>
            <h1>Statistics</h1>
          </div>
          {clientDataMap === null && <div className={'flex-container column'}><Loader/></div>}
          {!!clientDataMap && clientData.length === 0 && (
            <p>
              This server is not managing any instance of Kalliope.
              <br/>
              {'Host your own instance now using the '}
              <a href={'https://github.com/MeridianGH/kalliope#installation'} className={'underline'}>instructions</a>
              {' and make sure it\'s properly configured.'}
            </p>
          )}
          {clientData.length > 0 && (
            <div className={'flex-container column nowrap'} style={{ width: '100%' }}>
              <div className={'stats-metrics-container'}>
                <div className={'stats-metric flex-container space-between column start nowrap'}>
                  Total guilds:
                  <span>
                    {clientData.reduce((acc, cur) => cur.guilds.length + acc, 0)}
                    {' guilds'}
                  </span>
                </div>
                <div className={'stats-metric flex-container space-between column start nowrap'}>
                  {'Total users: '}
                  <span>
                    {clientData.reduce((acc, cur) => cur.users + acc, 0)}
                    {' users'}
                  </span>
                </div>
                <div className={'stats-metric flex-container space-between column start nowrap'}>
                  {'Average latency: '}
                  <span>
                    {clientData.reduce((acc, cur) => (cur.ping === -1 ? 0 : cur.ping) + acc, 0) / (clientData.filter((data) => data.ping !== -1).length || 1)}
                    <wbr/>
                    ms
                  </span>
                </div>
                <div className={'stats-metric flex-container space-between column start nowrap'}>
                  Currently playing in:
                  <span>
                    {playerList?.size ?? 0}
                    {' guilds'}
                  </span>
                </div>
                <div className={'stats-metric flex-container space-between column start nowrap'}>
                  Currently connected:
                  <span>
                    {clientData.length}
                    {' clients'}
                  </span>
                </div>
              </div>
              <div className={'stats-node-grid'}>
                {Object.entries(clientDataMap ?? {}).map(([clientId, data], index) => (
                  <div className={'stats-node-container'} key={index}>
                    <div className={`stats-node ${data.guilds.filter((guildId) => playerList?.has(guildId)).length > 0 ? 'playing' : ''}`} style={{ backgroundImage: `url(${data.displayAvatarURL})` }}/>
                    <div className={'stats-node-tooltip'}>
                      <p>
                        {data.displayName}
                        <br/>
                        {data.version ? 'v' + data.version : 'Unknown version'}
                      </p>
                      <p>
                        {'Guilds: '}
                        {data.guilds.length}
                        <br/>
                        {'Users: '}
                        {' '}
                        {data.users}
                        <br/>
                        {'Latency: '}
                        {data.ping}
                        ms
                        <br/>
                      </p>
                      <p className={'small-text'}>
                        Ready since:
                        <br/>
                        {new Date(data.readyTimestamp).toLocaleString()}
                      </p>
                      <button onClick={(event) => {
                        webSocket?.request({ type: 'requestClientData', clientId: clientId })
                        event.currentTarget.firstElementChild!.animate([{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 500, easing: 'ease-in-out' })
                      }}
                      >
                        <ArrowsClockwise/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  )
}
