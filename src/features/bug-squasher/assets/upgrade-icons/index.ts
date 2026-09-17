import type { UpgradeId } from "../../game/types"

import compilerOptimiserIcon from "./compiler-optimiser.png"
import forkedProcessIcon from "./forked-process.png"
import heavyRoundsIcon from "./heavy-rounds.png"
import integrityPatchIcon from "./integrity-patch.png"
import packetAcceleratorIcon from "./packet-accelerator.png"
import piercingPacketsIcon from "./piercing-packets.png"
import rapidFireIcon from "./rapid-fire.png"
import shieldCacheIcon from "./shield-cache.png"
import thrustersIcon from "./thrusters.png"
import wideBusIcon from "./wide-bus.png"

export const UPGRADE_ICONS: Record<UpgradeId, string> = {
  "rapid-fire": rapidFireIcon,
  "thrusters": thrustersIcon,
  "heavy-rounds": heavyRoundsIcon,
  "packet-accelerator": packetAcceleratorIcon,
  "forked-process": forkedProcessIcon,
  "piercing-packets": piercingPacketsIcon,
  "integrity-patch": integrityPatchIcon,
  "shield-cache": shieldCacheIcon,
  "wide-bus": wideBusIcon,
  "compiler-optimiser": compilerOptimiserIcon,
}