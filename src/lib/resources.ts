import type { Resource } from '../data/types'

export function getToolsNeeded(totals: Partial<Record<Resource, number>>): string[] {
  if (Object.keys(totals).length === 0) return []
  const tools: string[] = ['BBP Hammer']
  if ((totals.logs ?? 0) > 0) tools.push('Axe')
  if ((totals.planks ?? 0) > 0) tools.push('Handsaw')
  if ((totals.concreteBricks ?? 0) > 0 || (totals.mortarMix ?? 0) > 0) tools.push('Shovel / Pickaxe')
  if ((totals.logs ?? 0) > 0 || (totals.planks ?? 0) > 0) tools.push('Sharpening Stone')
  return tools
}
