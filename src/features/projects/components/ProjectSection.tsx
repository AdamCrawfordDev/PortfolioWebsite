import type {
  ReactNode,
} from "react"


type ProjectSectionProps = {
  title: string
  eyebrow?: string
  children: ReactNode
}


export default function ProjectSection({
  title,
  eyebrow,
  children,
}: ProjectSectionProps) {
  return (
    <section className="py-2">
      {eyebrow && (
        <div className="mb-1 font-comic text-[9px] uppercase tracking-[0.16em] text-white/25">
          {eyebrow}
        </div>
      )}

      <h2 className="font-comic-serif text-xl leading-tight text-white md:text-2xl">
        {title}
      </h2>

      <div
        className="
          mt-2
          max-w-3xl
          font-comic
          text-sm
          leading-6
          text-white/55
        "
      >
        {children}
      </div>
    </section>
  )
}
