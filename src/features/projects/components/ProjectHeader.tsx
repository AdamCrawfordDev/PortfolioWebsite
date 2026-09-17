import type {
  ProjectLink,
} from "../types"


type ProjectHeaderProps = {
  title: string
  subtitle: string
  stack: string[]
  links?: ProjectLink[]
}


export default function ProjectHeader({
  title,
  subtitle,
  stack,
  links = [],
}: ProjectHeaderProps) {
  return (
    <header className="pb-3 pt-1">

      <div className="mb-2 font-comic text-[9px] uppercase tracking-[0.18em] text-white/25">
        PROJECT
      </div>


      <h1
        className="
          max-w-3xl
          font-comic-serif
          text-3xl
          leading-none
          text-white
          md:text-4xl
        "
      >
        {title}
      </h1>


      <p
        className="
          mt-3
          max-w-2xl
          font-comic
          text-sm
          leading-6
          text-white/55
        "
      >
        {subtitle}
      </p>


      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1">

        {stack.map(
          (
            technology,
            index
          ) => (
            <div
              key={technology}
              className="flex items-center"
            >
              <span className="font-comic text-[11px] text-white/50">
                {technology}
              </span>


              {index <
                stack.length - 1 && (
                <span className="ml-2 text-white/15">
                  /
                </span>
              )}

            </div>
          )
        )}

      </div>


      {links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">

          {links.map(
            (link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="
                  rounded-[5px_10px_6px_12px]
                  border
                  border-white/20
                  px-3
                  py-1.5
                  font-comic
                  text-[11px]
                  text-white/60
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-white/45
                  hover:text-white
                "
              >
                {link.label} ↗
              </a>
            )
          )}

        </div>
      )}

    </header>
  )
}