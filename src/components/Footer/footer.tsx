import React from 'react'
import { SiDiscord, SiGithub, SiGmail, SiReact } from '@icons-pack/react-simple-icons'
import { HeartStraight } from '@phosphor-icons/react'
import './footer.scss'

export default function Footer() {
  return (
    <footer>
      <div className={'social-icons flex-container nowrap'}>
        <a href={'https://github.com/rmckr/kalliope'}><SiGithub /></a>
        <a href={'https://discord.gg/qX2CBrrUpf'}><SiDiscord /></a>
        <a href={'mailto:rmckr.dev@gmail.com'}><SiGmail /></a>
      </div>
      <span className={'small-text flex-container nowrap'} style={{ gap: '0.25em' }}>{'Made with '}<HeartStraight size={'1em'} color={'var(--accent)'} weight={'fill'} />{' using '}<SiReact size={'1em'} color={'default'} /></span>
      <a href={'https://kalliope.cc'} className={'small-text'}>© 2024 · Meridian · All rights reserved.</a>
    </footer>
  )
}
