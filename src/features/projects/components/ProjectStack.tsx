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
    <section className="py-4">

      <div className="mb-3 font-comic-serif text-xl text-white md:text-2xl">
        Built with
      </div>


      <div className="grid gap-2.5 md:grid-cols-2">

        {groups.map(
          (group) => (
            <div
              key={group.label}
              className="
                rounded-[7px_15px_9px_18px]
                border
                border-white/12
                px-4
                py-3
              "
            >

              <div className="font-comic text-[9px] uppercase tracking-[0.15em] text-white/25">
                {group.label}
              </div>


              <div className="mt-1.5 font-comic text-xs leading-5 text-white/60">
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