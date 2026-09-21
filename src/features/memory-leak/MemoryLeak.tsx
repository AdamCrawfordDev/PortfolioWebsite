import MemoryGame from "./game/MemoryGame"


export default function MemoryLeak() {
  return (
    <div className="w-full">

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">

        <div>

          <div className="font-comic text-[10px] uppercase tracking-[0.18em] text-white/25">
            process://heap
          </div>

          <h2 className="mt-1 font-comic-serif text-2xl text-white">
            Memory Leak
          </h2>

          <p className="mt-1 max-w-2xl font-comic text-xs leading-5 text-white/40">
            Memory is escaping. Build cleanup routines beside the allocation path,
            collect objects before they leak and keep RAM below 100%.
          </p>

        </div>


        <div className="font-comic text-[10px] text-white/25">
          tower defence · definitely not how malloc works
        </div>

      </div>


      <MemoryGame />

    </div>
  )
}
