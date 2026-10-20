import React, { createRef, FormEvent, useCallback } from 'react'
import { toast } from 'react-toastify'
import { Equalizer, Faders, ListPlus, Trash } from '@phosphor-icons/react'
import { Nullable, Player } from '../../../../shared/types'
import useWebSocket from '../../../hooks/webSocketHook'
import './controls.scss'

export type ControlsProps = {
  guildId: Nullable<string>,
  filter: Nullable<Player['filters']['current']>,
  hasPlayer: boolean
}

export default function Controls({ guildId, filter, hasPlayer }: ControlsProps) {
  const webSocket = useWebSocket()
  const inputRef = createRef<HTMLInputElement>()

  const disabled = !guildId || !hasPlayer

  const handlePlay = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!webSocket || !guildId) { return }
    const input = inputRef.current
    const query = input?.value
    if (!query) { return }
    void toast.promise(
      webSocket.request({ type: 'requestPlayerAction', guildId: guildId, action: 'play', payload: { query: query } }, true),
      {
        pending: `Adding '${query}' to queue...`,
        success: {
          render: ({ data }) => {
            const trackTitle = data.type === 'playerData' ?
              (data.player?.queue.tracks?.at(-1) ?? data.player?.queue.current)?.info.title :
              'Unknown track'
            return `Successfully added '${trackTitle}' to the queue.`
          }
        },
        error: { render: ({ data }) => `There was an error adding your track: ${(data as Error).message}` }
      }
    )
    if (input) { input.value = '' }
  }, [guildId, inputRef, webSocket])

  return (
    <div className={'controls-container flex-container column start nowrap'}>
      <div className={'flex-container nowrap'}>
        <Faders/>
        <h5 className={'controls-title'}>Controls</h5>
      </div>
      <form onSubmit={handlePlay} className={`controls-input controls-form ${!guildId ? 'disabled' : ''}`}>
        <input type={'text'} placeholder={'Add to queue'} ref={inputRef}/>
        <button tabIndex={-1}><ListPlus/></button>
      </form>
      <div className={`controls-input controls-select ${disabled ? 'disabled' : ''}`}>
        <Equalizer/>
        <select
          name={'filter'}
          id={'filter'}
          value={filter ?? 'none'}
          onChange={(event) => {
            const filter = event.target.value
            const filterText = event.target.options.item(event.target.options.selectedIndex)?.label ?? 'Unknown filter'
            if (!webSocket || !guildId) { return }
            void toast.promise(
              webSocket.request({
                type: 'requestPlayerAction',
                guildId: guildId,
                action: 'filter',
                payload: {
                  filter: filter,
                  filterText: filterText
                }
              }, true),
              {
                pending: `Setting filter '${filterText}'...`,
                success: `Successfully set filter to '${filterText}'.`,
                error: `Failed to set filter '${filterText}'. Please try again.`
              }
            )
          }}
        >
          <option disabled>Select a filter...</option>
          <option value={'none'}>No filter</option>
          <option value={'bassboost'}>Bass Boost</option>
          <option value={'classic'}>Classic</option>
          <option value={'eightd'}>8D</option>
          <option value={'earrape'}>Earrape</option>
          <option value={'karaoke'}>Karaoke</option>
          <option value={'nightcore'}>Nightcore</option>
          <option value={'superfast'}>Superfast</option>
          <option value={'vaporwave'}>Vaporwave</option>
        </select>
      </div>
      <div className={'controls-spacer'}></div>
      <button
        className={`controls-input controls-button ${disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!webSocket || !guildId) { return }
          void toast.promise(
            webSocket.request({
              type: 'requestPlayerAction',
              guildId: guildId,
              action: 'clear'
            }, true),
            {
              pending: 'Clearing the queue...',
              success: 'Successfully cleared the queue.',
              error: 'Failed to clear the queue. Please try again.'
            }
          )
        }}
      >
        <Trash/>
        {'Clear queue\r'}
      </button>
    </div>
  )
}
