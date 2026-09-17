import type {
  ReactNode,
} from "react"


type ProjectFeatureProps = {
  title: string
  children: ReactNode
  image?: string
  imageAlt?: string
  imageSide?: "left" | "right"
}


export default function ProjectFeature({
  title,
  children,
  image,
  imageAlt = "",
  imageSide = "right",
}: ProjectFeatureProps) {

  const imageBlock =
    image && (
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
          src={image}
          alt={imageAlt}
          className="
            h-full
            w-full
            rounded-[6px_15px_8px_18px]
            object-cover
          "
        />
      </div>
    )


  return (
    <section className="my-4 grid items-center gap-5 md:grid-cols-2">

      {imageSide ===
        "left" &&
        imageBlock}


      <div>

        <h2 className="font-comic-serif text-xl text-white md:text-2xl">
          {title}
        </h2>


        <div className="mt-2 font-comic text-sm leading-6 text-white/55">
          {children}
        </div>

      </div>


      {imageSide ===
        "right" &&
        imageBlock}

    </section>
  )
}