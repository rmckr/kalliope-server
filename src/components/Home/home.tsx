import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import VanillaTilt from 'vanilla-tilt'
import {
  AppWindow, ArrowSquareOut, Download, GithubLogo,
  Headphones, List, Playlist, SquaresFour,
  Terminal, Waveform, YoutubeLogo
} from '@phosphor-icons/react'
import usePageTitle from '../../hooks/pageTitleHook'
import './home.scss'

export default function Home() {
  usePageTitle('Kalliope.')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    if (searchParams.size > 0) {
      if (searchParams.has('logout')) { toast.success('Successfully logged out.') }
      if (searchParams.has('error')) { toast.error(`Discord authentication error:\n${decodeURIComponent(searchParams.get('error') ?? 'Unknown error')}`) }
      void navigate('/', { replace: true })
    }
  }, [navigate, searchParams])

  useEffect(() => {
    document.querySelector<HTMLDivElement>('.features-container')!.addEventListener('mousemove', (event: MouseEvent) => {
      for (const card of document.querySelectorAll<HTMLDivElement>('.feature-card')) {
        const rect = card.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        card.style.setProperty('--mouse-x', `${x}px`)
        card.style.setProperty('--mouse-y', `${y}px`)
      }
    })

    // noinspection JSCheckFunctionSignatures
    VanillaTilt.init(Array.from(document.querySelectorAll<HTMLElement>('.commands-container > code')), { reverse: true, startX: 10, startY: 10, scale: 1.2 })
  }, [])
  return (
    <div id={'home'}>
      <section id={'features'}>
        <div className={'flex-container nowrap'}>
          <SquaresFour size={'3rem'} weight={'fill'} />
          <h2>Features</h2>
        </div>
        <div className={'features-container'}>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <Waveform size={'5rem'} color={'var(--accent)'} />
              <h3>Full support</h3>
              <p>
                {'Kalliope still offers full support for almost every platform you can imagine.\r'}
              </p>
            </div>
          </div>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <Headphones size={'5rem'} color={'var(--accent)'} />
              <h3>High quality</h3>
              <p>
                {'Kalliope is using the well established library LavaLink for high quality playback.\r'}
              </p>
            </div>
          </div>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <YoutubeLogo size={'5rem'} color={'var(--accent)'} />
              <h3>YouTube Search</h3>
              <p>
                {'Search up to five songs from YouTube and play one directly from Discord.\r'}
              </p>
            </div>
          </div>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <AppWindow size={'5rem'} color={'var(--accent)'} />
              <h3>Dashboard</h3>
              <p>
                {'Use the web dashboard to control your bot without having to type out commands ever again.\r'}
              </p>
            </div>
          </div>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <Playlist size={'5rem'} color={'var(--accent)'} />
              <h3>Genius Lyrics</h3>
              <p>
                Kalliope supports Genius Lyrics, directly accessible in Discord via a command.<br />
              </p>
            </div>
          </div>
          <div className={'feature-card'}>
            <div className={'feature-card-content'}>
              <Terminal size={'5rem'} color={'var(--accent)'} />
              <h3>Easy commands</h3>
              <p>
                Kalliope uses slash-commands to integrate into Discord, which allows for easy command usage.<br />
              </p>
            </div>
          </div>
        </div>
      </section>
      <section id={'install'} className={'diagonal'}>
        <div className={'flex-container nowrap'}>
          <Download size={'3rem'} weight={'fill'} />
          <h2>Install</h2>
        </div>
        <div className={'flex-container column'}>
          <p>
            {'You\'ll need to install your own version of Kalliope in order to add it to your server.'}
            <br />
            {'But don\'t worry, it\'s really easy and fast.'}
            <br />
            <br />
          </p>
          <a href={'https://github.com/rmckr/kalliope#installation'} className={'cta-button flex-container nowrap'}>
            Get Started
            <ArrowSquareOut />
          </a>
        </div>
      </section>
      <section id={'commands'}>
        <div className={'flex-container nowrap'}>
          <List size={'3rem'} weight={'fill'} />
          <h2>Commands</h2>
        </div>
        <div className={'commands-container'}>
          {['/play', '/search', '/lyrics', '/shuffle', '/pause', '/nowplaying', '/queue', '/filter', '/autoplay', '/sponsorblock', '/skip', '/previous', '/seek', '/clear', '/volume', '/repeat', 'And more...']
            .map((command, index) => <code key={index}>{command}</code>
            )}
        </div>
        <a href={'https://github.com/rmckr/kalliope#commands'} target={'_black'} className={'cta-button flex-container nowrap'}>
          View all commands
          <ArrowSquareOut />
        </a>
      </section>
      <section id={'github'} className={'diagonal reverse'}>
        <div className={'flex-container nowrap'}>
          <GithubLogo size={'3rem'} weight={'duotone'} />
          <h2>GitHub</h2>
        </div>
        <div className={'flex-container column'}>
          <p>
            {'Kalliope is open-source! You can find it\'s source-code, releases and more info using the link below.'}
            <br />
            {'However, please be mindful of the license if you\'re interested in redistributing code from the repository.'}
            <br />
            <br />
          </p>
          <a href={'https://github.com/rmckr/kalliope'} target={'_blank'} className={'cta-button flex-container nowrap'} rel={'noreferrer'}>
            GitHub
            <ArrowSquareOut />
          </a>
        </div>
      </section>
    </div>
  )
}
