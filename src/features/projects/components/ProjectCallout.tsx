type ProjectCalloutProps = {
  value: string
  label: string
}


export default function ProjectCallout({
  value,
  label,
}: ProjectCalloutProps) {
  return (
    <aside
      className="
        my-4
        rounded-[8px_18px_10px_22px]
        border
        border-white/12
        bg-white/[0.018]
        px-4
        py-3
        md:px-5
      "
    >
      <div className="font-comic-serif text-2xl leading-none text-white">
        {value}
      </div>

      <div className="mt-1.5 max-w-2xl font-comic text-[11px] leading-5 text-white/40">
        {label}
      </div>
    </aside>
  )
}
