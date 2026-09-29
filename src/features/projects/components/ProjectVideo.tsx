type ProjectVideoProps = {
  src: string
  alt: string
  caption?: string
  poster?: string
  fallbackSrc?: string
  contain?: boolean
  flush?: boolean
}


export default function ProjectVideo({
  src,
  alt,
  caption,
  poster,
  fallbackSrc,
  contain = false,
  flush = false,
}: ProjectVideoProps) {
  return (
    <figure className={flush ? "w-full" : "my-3.5 w-full"}>
      <div
        className="
          overflow-hidden
          rounded-[8px_18px_10px_22px]
          border
          border-white/12
          bg-white/[0.02]
          p-1
        "
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-label={alt}
          className={`
            block
            w-full
            rounded-[6px_15px_8px_18px]
            bg-[#000112]
            ${
              contain
                ? "object-contain"
                : "object-cover"
            }
          `}
        >
          <source
            src={src}
            type="video/webm"
          />

          {fallbackSrc && (
            <source
              src={fallbackSrc}
              type="video/mp4"
            />
          )}

          Your browser does not support video playback.
        </video>
      </div>

      {caption && (
        <figcaption className="mt-1.5 px-2 font-comic text-[10px] leading-4 text-white/30">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
