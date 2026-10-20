import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  IconContext, CaretDown, PauseCircle, PlayCircle, Queue,
  Repeat, RepeatOnce, Shuffle, SkipBack, SkipForward,
  SpeakerHigh, SpeakerLow, SpeakerNone, SpeakerX
} from '@phosphor-icons/react'
import { useSwipeable } from 'react-swipeable'
import { Nullable, Player, Track } from '../../../../shared/types'
import useWebSocket from '../../../hooks/webSocketHook'
import Thumbnail from '../Thumbnail/thumbnail'
import LoadingButton from '../../LoadingButton/loadingbutton'
import './playerbar.scss'

export type PlayerBarProps = {
  guildId: Nullable<string>,
  current: Nullable<Track>,
  position: Nullable<number>,
  volume: Nullable<number>,
  timescale: Nullable<number>,
  paused: Nullable<boolean>,
  repeatMode: Nullable<Player['repeatMode']>,
  settings: Nullable<Player['settings']>
}

export default function PlayerBar({ guildId, current, position, volume, timescale, paused, repeatMode, settings }: PlayerBarProps) {
  const webSocket = useWebSocket()
  const [currentPosition, setCurrentPosition] = useState(position ?? 0)
  const [currentVolume, setCurrentVolume] = useState(50)
  const [expanded, setExpanded] = useState(false)
  const isMobile = window.matchMedia('screen and (max-width: 768px)').matches
  const disabled = !guildId || !current

  const msToHMS = useCallback((ms: number) => {
    let totalSeconds = ms / 1000
    const hours = Math.floor(totalSeconds / 3600).toString()
    totalSeconds %= 3600
    const minutes = Math.floor(totalSeconds / 60).toString()
    const seconds = Math.floor(totalSeconds % 60).toString()
    return hours === '0' ? `${minutes}:${seconds.padStart(2, '0')}` : `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
  }, [])

  useEffect(() => {
    if (volume) { setCurrentVolume(volume) }
  }, [volume])

  useEffect(() => {
    if (!current?.info.artworkUrl) {
      document.querySelector<HTMLDivElement>('.player-bar')!.style.setProperty('--dominant-color', 'var(--accent)')
      return
    }

    fetch(window.location.origin + '/api/colors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: current.info.artworkUrl,
        preventSimilar: getComputedStyle(document.documentElement).getPropertyValue('--hover')
      })
    }).then((res) => res.json()).then((body: { color?: string }) => {
      document.querySelector<HTMLDivElement>('.player-bar')!.style.setProperty('--dominant-color', body.color ?? 'var(--accent)')
    }).catch((error) => console.warn(error))
  }, [current])

  const location = useLocation()
  const navigate = useNavigate()

  const expand = useCallback(() => {
    if (!isMobile) { return }
    void navigate('/dashboard', { state: 'expanded' })
  }, [isMobile, navigate])
  const collapse = useCallback(() => {
    if (!isMobile) { return }
    void navigate(-1)
  }, [isMobile, navigate])

  useEffect(() => {
    if (!isMobile) { return }
    setExpanded(location.state === 'expanded')
  }, [expanded, isMobile, location.state, navigate])
  useEffect(() => {
    if (!isMobile) { return }
    if (expanded && location.state === 'expanded' && disabled) { collapse() }
  }, [collapse, disabled, expanded, isMobile, location.state])

  useEffect(() => {
    if (!Number.isFinite(position) || disabled || paused) { return }
    setCurrentPosition(position!)
    const interval = setInterval(() => {
      setCurrentPosition((prevPosition) => {
        if (prevPosition >= current.info.duration) {
          clearInterval(interval)
          return current.info.duration
        }
        return prevPosition + 1000
      })
    }, 1000 * (1 / (timescale ?? 1)))
    return () => { clearInterval(interval) }
  }, [position, current, disabled, paused, timescale])

  const swipeableHandlers = useSwipeable({
    onSwipedDown: () => {
      if (isMobile && expanded) { collapse() }
    },
    onSwipedUp: () => {
      if (isMobile && !expanded) { expand() }
    },
    swipeDuration: 500,
    preventScrollOnSwipe: true
  })
  return (
    <div {...swipeableHandlers} className={`player-bar ${expanded ? 'expanded' : ''} flex-container space-between nowrap`}>
      {expanded && <button className={'player-collapse-button'} onClick={collapse}><CaretDown/></button>}
      <div className={'player-song flex-container start nowrap'} onClick={!disabled && !expanded ? expand : undefined}>
        {!disabled && (
          <>
            <div className={'player-song-gradient'}></div>
            <a className={`flex-container ${expanded ? 'column' : ''} start nowrap`} href={current.info.uri} rel={'noreferrer'} target={'_blank'}>
              <Thumbnail image={current.info.artworkUrl} fitTo={expanded ? 'width' : 'height'}/>
              <div className={'player-song-title flex-container column start nowrap'}>
                <b>{current.info.title}</b>
                <span>{current.info.author}</span>
              </div>
            </a>
          </>
        )}
      </div>
      <div className={'flex-container column nowrap'}>
        <div className={'player-buttons flex-container nowrap'}>
          <IconContext.Provider value={{ size: expanded ? '2rem' : '1.5rem' }}>
            {(!isMobile || expanded) && (
              <>
                <LoadingButton
                  disabled={disabled}
                  onClick={async () => {
                    if (!webSocket || !guildId) { return }
                    await webSocket.request({
                      type: 'requestPlayerAction',
                      guildId: guildId,
                      action: 'shuffle'
                    }, true)
                  }}
                >
                  <Shuffle/>
                </LoadingButton>
                <LoadingButton
                  disabled={disabled}
                  onClick={async () => {
                    if (!webSocket || !guildId) { return }
                    await webSocket.request({
                      type: 'requestPlayerAction',
                      guildId: guildId,
                      action: 'previous'
                    }, true)
                  }}
                >
                  <SkipBack/>
                </LoadingButton>
              </>)}
            <LoadingButton
              disabled={disabled}
              onClick={async () => {
                if (!webSocket || !guildId) { return }
                await webSocket.request({
                  type: 'requestPlayerAction',
                  guildId: guildId,
                  action: 'pause'
                }, true)
              }}
            >
              {paused ?? disabled ?
                <PlayCircle size={expanded ? '4rem' : '3rem'} weight={'fill'}/> :
                <PauseCircle size={expanded ? '4rem' : '3rem'} weight={'fill'}/>}
            </LoadingButton>
            {(!isMobile || expanded) && (
              <>
                <LoadingButton
                  disabled={disabled}
                  onClick={async () => {
                    if (!webSocket || !guildId) { return }
                    await webSocket.request({
                      type: 'requestPlayerAction',
                      guildId: guildId,
                      action: 'skip'
                    }, true)
                  }}
                >
                  <SkipForward/>
                </LoadingButton>
                <LoadingButton
                  className={`player-repeat-button ${repeatMode ?? 'off'}`}
                  disabled={disabled}
                  onClick={async () => {
                    if (!webSocket || !guildId) { return }
                    await webSocket.request({
                      type: 'requestPlayerAction',
                      guildId: guildId,
                      action: 'repeat'
                    }, true)
                  }}
                >
                  {repeatMode === 'track' ? <RepeatOnce/> : <Repeat/>}
                </LoadingButton>
              </>)}
          </IconContext.Provider>
        </div>
        <div className={'progress-wrapper flex-container nowrap'}>
          {(!isMobile || expanded) && <span>{disabled ? '-:-' : msToHMS(currentPosition)}</span>}
          <div className={'progress-bar-container'}>
            <div
              className={'progress-bar'}
              style={{ width: `${disabled ? '0%' : current.info.isStream ? '100%' : currentPosition / current.info.duration * 100 + '%'}` }}
            >
            </div>
          </div>
          {(!isMobile || expanded) && <span>{disabled ? '-:-' : !current.info.isStream ? msToHMS(current.info.duration) : '🔴 Live'}</span>}
        </div>
      </div>
      {(!isMobile || expanded) && (
        <div className={'extras-container flex-container nowrap'}>
          {!disabled && (
            <>
              <div className={'flex-container nowrap'}>
                <LoadingButton
                  className={`autoplay-button ${settings?.autoplay ? 'active' : ''} tooltip`}
                  onClick={async () => {
                    if (!webSocket || !guildId) { return }
                    await webSocket.request({
                      type: 'requestPlayerAction',
                      guildId: guildId,
                      action: 'autoplay'
                    }, true)
                  }}
                >
                  <span className={'tooltip-content'}>Toggle Autoplay</span>
                  <Queue/>
                </LoadingButton>
                {settings?.sponsorblockSupport && (
                  <LoadingButton
                    className={`sponsorblock-button ${settings?.sponsorblock ? 'active' : ''} tooltip`}
                    onClick={async () => {
                      if (!webSocket || !guildId) { return }
                      await webSocket.request({
                        type: 'requestPlayerAction',
                        guildId: guildId,
                        action: 'sponsorblock'
                      }, true)
                    }}
                  >
                    <span className={'tooltip-content'}>Toggle SponsorBlock</span>
                    <div className={'sponsorblock-logo'}></div>
                  </LoadingButton>
                )}
              </div>
              <div className={'volume-container flex-container column nowrap'}>
                <div className={'volume-text'}>
                  {currentVolume === 0 ?
                    <SpeakerX/> :
                    currentVolume <= 33 ?
                      <SpeakerNone/> :
                      currentVolume <= 66 ?
                        <SpeakerLow/> :
                        <SpeakerHigh/>}
                  {currentVolume}
                </div>
                <div className={'volume-slider-container'}>
                  <input
                    className={'volume-slider-input'}
                    type={'range'}
                    inputMode={'none'}
                    defaultValue={currentVolume.toString()}
                    step={'1'}
                    min={'0'}
                    max={'100'}
                    onInput={() => {
                      setCurrentVolume(parseInt(document.querySelector<HTMLInputElement>('.volume-slider-input')!.value))
                    }}
                    onMouseUp={() => {
                      if (!webSocket || !guildId) { return }
                      webSocket.request({
                        type: 'requestPlayerAction',
                        guildId: guildId,
                        action: 'volume',
                        payload: { volume: parseInt(document.querySelector<HTMLInputElement>('.volume-slider-input')!.value) }
                      })
                    }}
                  />
                  <div className={'volume-slider-range'} style={{ width: `${currentVolume}%` }}></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
