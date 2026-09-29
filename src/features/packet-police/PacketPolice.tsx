import NetworkGame from "./game/NetworkGame"

export default function PacketPolice() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <NetworkGame />
    </div>
  )
}