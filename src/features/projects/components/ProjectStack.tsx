import type {
  StackGroup,
} from "../types"


type ProjectStackProps = {
  groups: StackGroup[]
}


export default function ProjectStack({
  groups,
}: ProjectStackProps) {
  return (
    <section className="pb-2 pt-3">
      <h2 className="mb-2.5 font-comic-serif text-xl leading-tight text-white md:text-2xl">
        Built with
      </h2>

      <div className="grid gap-2 md:grid-cols-2">
        {groups.map(
          (group) => (
            <div
              key={group.label}
              className="
                rounded-[7px_15px_9px_18px]
                border
                border-white/12
                bg-white/[0.015]
                px-3.5
                py-2.5
              "
            >
              <div className="font-comic text-[9px] uppercase tracking-[0.15em] text-white/28">
                {group.label}
              </div>

              <div className="mt-1 font-comic text-xs leading-5 text-white/60">
                {group.items.join(
                  " · "
                )}
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}
