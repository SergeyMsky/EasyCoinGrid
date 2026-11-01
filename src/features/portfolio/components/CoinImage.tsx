import { useEffect, useRef, useState } from 'react'
import { getCachedCoinImage, getCoinsMetadata } from '@/features/portfolio/api/portfolio.api'

const MISSING_IMAGE_MAX_ATTEMPTS = 3
const MISSING_IMAGE_RETRY_DELAYS = [300, 600]
const BROKEN_IMAGE_MAX_RETRIES = 2

function getImageUrlWithoutRetryParameter(imageUrl: string) {
  const url = new URL(imageUrl, window.location.href)
  url.searchParams.delete('__image_retry')
  return url.toString()
}

type CoinImageProps = {
  asset: string
  image: string | null | undefined
  resolveMissingImage?: boolean
  className?: string
}

export function CoinImage({ asset, image, resolveMissingImage = false, className }: CoinImageProps) {
  const cachedImage = getCachedCoinImage(asset)
  const currentImage = cachedImage ?? image
  return (
    <CoinImageWithSource
      key={`${asset}:${currentImage ?? ''}:${resolveMissingImage}`}
      asset={asset}
      image={currentImage}
      resolveMissingImage={resolveMissingImage}
      className={className}
    />
  )
}

function CoinImageWithSource({ asset, image, resolveMissingImage, className }: CoinImageProps) {
  const imageClassName = `h-7.5 w-7.5 shrink-0 rounded-full object-cover ${className}`
  const [imageSrc, setImageSrc] = useState(image)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [resolvingMissingImage, setResolvingMissingImage] = useState(resolveMissingImage && !image)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!resolveMissingImage || imageSrc) return

    let active = true

    async function resolveImage() {
      let lastError: unknown

      for (let attempt = 0; attempt < MISSING_IMAGE_MAX_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, MISSING_IMAGE_RETRY_DELAYS[attempt - 1]))
        }
        if (!active) return

        try {
          const metadata = await getCoinsMetadata([asset], { forceRefresh: attempt > 0 })
          const resolvedImage = metadata[asset.toUpperCase()]?.image

          if (resolvedImage) {
            if (active) setImageSrc(resolvedImage)
            return
          }
        } catch (error) {
          lastError = error
        }
      }

      if (lastError) {
        console.warn(`Asset image metadata unavailable after retries for ${asset}:`, lastError)
      } else {
        console.warn(`No coin image was returned after retries for ${asset}.`)
      }
    }

    void resolveImage().finally(() => {
      if (active) setResolvingMissingImage(false)
    })

    return () => {
      active = false
    }
  }, [asset, imageSrc, resolveMissingImage])

  async function handleImageError() {
    if (!imageSrc || attemptsRef.current >= BROKEN_IMAGE_MAX_RETRIES) {
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

  if ((resolvingMissingImage && !imageSrc) || refreshing) {
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
