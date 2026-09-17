import type {
  ReactNode,
} from "react"


type ProjectReadmeProps = {
  projectId: string
  children: ReactNode
  onBack?: () => void
}


export default function ProjectReadme({
  projectId,
  children,
  onBack,
}: ProjectReadmeProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">

      <div className="mb-4 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 pb-2.5">

        <div className="min-w-0 font-comic text-[10px] tracking-[0.06em] text-white/30">

          <span className="text-white/18">
            ~/portfolio/projects/
          </span>

          <span className="text-white/45">
            {projectId}/README.md
          </span>

        </div>


        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="
              shrink-0
              font-comic
              text-[10px]
              tracking-[0.06em]
              text-white/35
              transition-all
              duration-200
              hover:-translate-x-1
              hover:text-white
            "
          >
            ← projects
          </button>
        )}

      </div>


      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          pr-2

          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-white/15
          [&::-webkit-scrollbar-track]:bg-transparent
        "
      >

        <div className="mx-auto w-full max-w-4xl pb-8">
          {children}
        </div>

      </div>

    </div>
  )
}