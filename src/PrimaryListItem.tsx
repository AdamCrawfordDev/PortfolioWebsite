type ListItemProps = {
  name: string
  underline: string
  selected: boolean
  directory?: boolean
  onClick: () => void
}

function PrimaryListItem({
  name,
  underline,
  selected,
  directory = false,
  onClick,
}: ListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        flex
        w-full
        items-center
        gap-3
        py-1
        text-left
        font-comic
        text-2xl
        transition-all
        duration-150
        ${
          selected
            ? "translate-x-2 text-white"
            : "text-slate-500 hover:text-slate-300"
        }
      `}
    >
      <span
        className={`
          w-4
          shrink-0
          text-center
          transition-all
          duration-150
          ${
            selected
              ? "opacity-100"
              : "opacity-0"
          }
        `}
      >
        &gt;
      </span>

      <span className="relative">
        {name}

        {directory && (
          <span className="ml-1 text-white/25">
            /
          </span>
        )}

        {selected && (
          <img
            src={underline}
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              -bottom-2
              left-0
              h-[14px]
              w-[110%]
            "
          />
        )}
      </span>
    </button>
  )
}

export default PrimaryListItem
