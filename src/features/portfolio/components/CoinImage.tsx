type CoinImageProps = {
  asset: string
  image: string | null | undefined
  className?: string
}

export function CoinImage({ asset, image, className }: CoinImageProps) {
  if (!image) return null

  return <img src={image} alt={asset} className={`h-7.5 w-7.5 shrink-0 rounded-full object-cover ${className}`} />
}
