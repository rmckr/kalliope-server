import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { DotsSixVertical, DotsThreeVertical, Play, Trash } from '@phosphor-icons/react'
import { Track } from '../../../../shared/types'
import useWebSocket from '../../../hooks/webSocketHook'
import LoadingButton from '../../LoadingButton/loadingbutton'
import Thumbnail from '../Thumbnail/thumbnail'
import './queuetrack.scss'

export type QueueTrackProps = {
  index: number,
  guildId: string,
  trackInfo: Track['info']
}

export default function QueueTrack({ index, guildId, trackInfo }: QueueTrackProps) {
  const webSocket = useWebSocket()
  const sortable = useSortable({
    id: index + 1,
    transition: {
      duration: 250,
      easing: 'ease-in-out'
    }
  })
  const [expanded, setExpanded] = useState(false)
  const isMobile = window.matchMedia('screen and (max-width: 768px)').matches

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    boxShadow: sortable.isDragging ? '2px 2px 5px black' : 'unset',
    zIndex: sortable.isDragging ? 999 : 'unset'
  }

  const handleSkipTo = () => {
    const trackTitle = trackInfo.title
    if (!webSocket || !guildId) { return }
    void toast.promise(
      webSocket?.request({
        type: 'requestPlayerAction',
        guildId: guildId,
        action: 'skip',
        payload: { index: index + 1 }
      }, true),
      {
        pending: `Skipping to '${trackTitle}'...`,
        success: `Successfully skipped to '${trackTitle}'.`,
        error: `Failed to skip to '${trackTitle}'. Please try again.`
      }
    )
  }

  return (
    <div
      key={index + 1}
      className={`queue-track ${expanded ? 'expanded' : ''} flex-container space-between nowrap`}
      style={style}
      ref={sortable.setNodeRef}
      onBlur={() => setExpanded(false)}
    >
      <div className={`flex-container nowrap ${isMobile ? 'start' : ''}`}>
        {isMobile ?
          <Thumbnail image={trackInfo.artworkUrl} fitTo={'height'}/> :
          (
            <LoadingButton className={'queue-track-skipto'} onClick={handleSkipTo}>
              <Thumbnail image={trackInfo.artworkUrl} fitTo={'height'}/>
              <Play weight={'fill'}/>
            </LoadingButton>
          )}
        <div className={'queue-track-text flex-container column start nowrap'}>
          <a href={trackInfo.uri} rel={'noreferrer'} target={'_blank'} style={isMobile ? { pointerEvents: 'none' } : undefined}><b>{trackInfo.title}</b></a>
          <span>{trackInfo.author}</span>
        </div>
      </div>
      {isMobile && <button onClick={() => setExpanded(!expanded)}><DotsThreeVertical/></button>}
      <div className={`queue-track-actions flex-container ${isMobile ? 'space-between' : ''} nowrap`}>
        {isMobile && <LoadingButton onClick={handleSkipTo}><Play weight={'fill'}/></LoadingButton>}
        <LoadingButton
          className={'queue-track-remove'}
          onClick={() => {
            const trackTitle = trackInfo.title
            if (!webSocket || !guildId) { return }
            void toast.promise(
              webSocket?.request({
                type: 'requestPlayerAction',
                guildId: guildId,
                action: 'remove',
                payload: { index: index + 1 }
              }, true),
              {
                pending: `Removing '${trackTitle}' from the queue...`,
                success: `Successfully removed '${trackTitle}' from the queue.`,
                error: `Failed to remove '${trackTitle}' from the queue. Please try again.`
              }
            )
          }}
        >
          <Trash weight={'fill'}/>
        </LoadingButton>
        <DotsSixVertical className={'queue-track-draghandle'} style={{ cursor: sortable.isDragging ? 'grabbing' : 'grab' }} {...sortable.attributes} {...sortable.listeners}/>
      </div>
    </div>
  )
}
