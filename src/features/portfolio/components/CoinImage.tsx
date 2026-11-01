import { useRef, useState } from 'react'
import { getCachedCoinImage, getCoinsMetadata } from '@/features/portfolio/api/portfolio.api'

function getImageUrlWithoutRetryParameter(imageUrl: string) {
  const url = new URL(imageUrl, window.location.href)
  url.searchParams.delete('__image_retry')
  return url.toString()
}

type CoinImageProps = {
  asset: string
  image: string | null | undefined
  loading?: boolean
  className?: string
}

export function CoinImage({ asset, image, loading = false, className }: CoinImageProps) {
  const cachedImage = getCachedCoinImage(asset)
  const currentImage = cachedImage ?? image
  return <CoinImageWithSource key={`${asset}:${currentImage ?? ''}`} asset={asset} image={currentImage} loading={loading} className={className} />
}

function CoinImageWithSource({ asset, image, loading, className }: CoinImageProps) {
  const imageClassName = `h-7.5 w-7.5 shrink-0 rounded-full object-cover ${className}`
  const [imageSrc, setImageSrc] = useState(image)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const attemptsRef = useRef(0)

  async function handleImageError() {
    if (!imageSrc || attemptsRef.current >= 2) {
      setFailed(true)
      return
    }

    attemptsRef.current += 1
    const attempt = attemptsRef.current
    setRefreshing(true)

    try {
      const metadata = await getCoinsMetadata([asset], { forceRefresh: true })

      const refreshedImage = metadata[asset.toUpperCase()]?.image
      if (refreshedImage && getImageUrlWithoutRetryParameter(refreshedImage) !== getImageUrlWithoutRetryParameter(imageSrc)) {
        setImageSrc(refreshedImage)
      } else {
        const retryUrl = new URL(imageSrc, window.location.href)
        retryUrl.searchParams.set('__image_retry', `${Date.now()}-${attempt}`)
        setImageSrc(retryUrl.toString())
      }
    } catch (error) {
      console.warn(`Unable to refresh ${asset} image metadata:`, error)

      const retryUrl = new URL(imageSrc, window.location.href)
      retryUrl.searchParams.set('__image_retry', `${Date.now()}-${attempt}`)
      setImageSrc(retryUrl.toString())
    } finally {
      setRefreshing(false)
    }
  }

  if ((loading && !imageSrc) || refreshing) {
    return <span role="img" aria-label={`Loading ${asset} image`} aria-busy="true" className={`${imageClassName} animate-pulse bg-surface-raised`} />
  }

  if (!imageSrc || failed) {
    return (
      <span
        aria-hidden="true"
        className={`flex items-center justify-center bg-surface-raised text-[10px] font-semibold text-muted ${imageClassName}`}>
        {asset.slice(0, 3)}
      </span>
    )
  }

  return <img src={imageSrc} alt={asset} className={imageClassName} loading="lazy" decoding="async" onError={() => void handleImageError()} />
}
