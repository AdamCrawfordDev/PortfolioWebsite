type ProjectImageProps = {
  src: string
  alt: string
  caption?: string
  contain?: boolean
}


export default function ProjectImage({
  src,
  alt,
  caption,
  contain = false,
}: ProjectImageProps) {
  return (
    <figure className="my-4">

      <div
        className="
          overflow-hidden
          rounded-[8px_18px_10px_22px]
          border
          border-white/15
          bg-white/[0.025]
          p-1
        "
      >
        <img
          src={src}
          alt={alt}
          className={`
            w-full
            rounded-[6px_15px_8px_18px]
            ${
              contain
                ? "object-contain"
                : "object-cover"
            }
          `}
        />
      </div>


      {caption && (
        <figcaption className="mt-1.5 pl-2 font-comic text-[10px] leading-5 text-white/28">
          {caption}
        </figcaption>
      )}

    </figure>
  )
}