import React from 'react'
import { Nullable } from '../../../../shared/types'
import imagePlaceholder from '../../../assets/image_placeholder.png'
import './thumbnail.scss'

export type ThumbnailProps = {
  image: Nullable<string>,
  // size: `${number}${'%' | 'px' | 'em' | 'rem' | 'vh' | 'vw'}`
  fitTo: 'width' | 'height'
}

export default function Thumbnail({ image, fitTo }: ThumbnailProps) {
  const style = {}
  style[fitTo] = '100%'
  return (
    <div className={'thumbnail-container'} style={style}>
      <img className={'thumbnail-backdrop'} src={image ?? imagePlaceholder} alt={'Thumbnail Background'}/>
      <img className={'thumbnail'} src={image ?? imagePlaceholder} alt={'Video Thumbnail'}/>
    </div>
  )
}
