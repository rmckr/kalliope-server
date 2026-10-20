import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Track } from '../../shared/types'
import useWebSocket from './webSocketHook'
import nearSilence from '../assets/near-silence.mp3'

export default function useMediaSession(guildId?: string, track?: Track, paused?: boolean) {
  const [hasError, setHasError] = useState<boolean>(false)
  const webSocket = useWebSocket()

  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) { return }
    if (hasError) {
      console.warn('Autoplay disabled!')
      document.addEventListener('click', () => { setHasError(false) }, { once: true })
    }

    const audio = new Audio(nearSilence)
    audio.volume = 0.00001
    audio.loop = true
    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(() => {
        setHasError(true)
        audio.src = ''
        audio.removeAttribute('src')
        audio.load()
      })
    })
    return () => {
      audio.src = ''
      audio.removeAttribute('src')
      audio.load()
    }
  }, [hasError, track])

  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      toast.warn('Your browser does not support media notifications!')
      return
    }
    if (!webSocket || !guildId || !track) {
      navigator.mediaSession.metadata = null
      return
    }

    const htmlDecode = (input: string) => new DOMParser().parseFromString(input, 'text/html').documentElement.textContent

    navigator.mediaSession.metadata = new MediaMetadata({
      title: htmlDecode(track.info.title) ?? 'Unknown title',
      artist: htmlDecode(track.info.author) ?? 'Unknown artist',
      album: htmlDecode(track.info.author) ?? 'Unknown album',
      artwork: [{ src: htmlDecode(track.info.artworkUrl ?? '') ?? '' }]
    })
    navigator.mediaSession.playbackState = paused ? 'paused' : 'playing'

    function handleMediaAction(action: 'pause' | 'skip' | 'previous') {
      if (!webSocket || !guildId) { return }
      webSocket.request({ type: 'requestPlayerAction', guildId: guildId, action: action })
    }

    navigator.mediaSession.setActionHandler('play', () => { handleMediaAction('pause') })
    navigator.mediaSession.setActionHandler('pause', () => { handleMediaAction('pause') })
    navigator.mediaSession.setActionHandler('nexttrack', () => { handleMediaAction('skip') })
    navigator.mediaSession.setActionHandler('previoustrack', () => { handleMediaAction('previous') })
  }, [guildId, paused, track, webSocket])
}
