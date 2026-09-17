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
        my-4
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
                border-white/15
                bg-white/[0.025]
                p-1
              "
            >
              <img
                src={image.src}
                alt={image.alt}
                className="
                  h-full
                  w-full
                  rounded-[6px_15px_8px_18px]
                  object-cover
                "
              />
            </div>


            {image.caption && (
              <figcaption className="mt-1.5 pl-2 font-comic text-[10px] text-white/28">
                {image.caption}
              </figcaption>
            )}

          </figure>
        )
      )}

    </div>
  )
}