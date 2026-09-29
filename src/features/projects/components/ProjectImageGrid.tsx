import type {
  ProjectImageItem,
} from "../types"


type ProjectImageGridProps = {
  images: ProjectImageItem[]
}


export default function ProjectImageGrid({
  images,
}: ProjectImageGridProps) {
  return (
    <div
      className={`
        my-3.5
        grid
        gap-3
        ${
          images.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2"
        }
      `}
    >
      {images.map(
        (image) => (
          <figure
            key={image.src}
            className={
              images.length === 3
                ? "last:md:col-span-2"
                : ""
            }
          >
            <div
              className="
                h-full
                overflow-hidden
                rounded-[8px_18px_10px_22px]
                border
                border-white/12
                bg-white/[0.02]
                p-1
              "
            >
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                className="
                  block
                  h-full
                  w-full
                  rounded-[6px_15px_8px_18px]
                  object-cover
                "
              />
            </div>

            {image.caption && (
              <figcaption className="mt-1.5 px-2 font-comic text-[10px] leading-4 text-white/30">
                {image.caption}
              </figcaption>
            )}
          </figure>
        )
      )}
    </div>
  )
}
