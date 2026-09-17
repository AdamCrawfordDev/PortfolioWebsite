type ProjectCalloutProps = {
  value: string
  label: string
}


export default function ProjectCallout({
  value,
  label,
}: ProjectCalloutProps) {
  return (
    <div
      className="
        my-4
        rounded-[8px_18px_10px_22px]
        border
        border-white/15
        px-5
        py-3.5
      "
    >

      <div className="font-comic-serif text-2xl text-white">
        {value}
      </div>


      <div className="mt-1 font-comic text-[11px] leading-5 text-white/35">
        {label}
      </div>

    </div>
  )
}