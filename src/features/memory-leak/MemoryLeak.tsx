import MemoryGame from "./game/MemoryGame"

export default function MemoryLeak() {
  return (
    <div className="font-comic">
      <div className="mb-5">
        <div className="text-xs text-white/30">
          /minigames/memory-leak.exe
        </div>

        <h2 className="mt-2 font-comic-serif text-3xl text-white">
          Memory Leak
        </h2>
      </div>

      <div className="mb-2">
        <div className="mb-1 flex justify-between text-[9px] tracking-[0.12em] text-white/20">
          <span>
            PROCESS://HEAP
          </span>

          <span>
            TOWER DEFENCE · DEFINITELY NOT HOW MALLOC WORKS
          </span>
        </div>

        <div className="h-1 overflow-hidden bg-white/5">
          <div className="h-full w-full bg-white/45" />
        </div>
      </div>

      <div className="relative overflow-hidden border border-white/5">
        <MemoryGame />
      </div>
    </div>
  )
}