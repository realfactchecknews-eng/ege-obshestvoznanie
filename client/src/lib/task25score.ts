export interface AiTask25 {
  justification: { usesKnowledge: boolean; causalLinks: 'full' | 'partial' | 'none'; hasErrors: boolean; comment?: string }
  items: { ok: boolean; comment?: string }[]
  examples: { ok: boolean; issue?: string; comment?: string }[]
  jointRequirementMet?: boolean
  advice?: string
}

export interface Score25 { k1: number; k2: number; k3: number; total: number }

/** Предложения считаем по знакам конца; «обоснование в одном предложении» по критериям — 0 баллов. */
export function countSentences(text: string): number {
  return text.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim().length >= 10).length
}

/** Требование «в совокупности / не дублировать» есть в условии — только тогда верим флагу модели. */
export const jointRequired = (taskText: string) => /в совокупности|не должны дублировать/i.test(taskText)

/**
 * К1 (0–2) + К2 (0–1) + К3 (0–3) по критериям книги. Баллы собирает код из разбора модели.
 * Допущения: обоснование со знаниями, но совсем без причинно-следственных связей даю 0 (описание, не обоснование);
 * при невыполненном требовании «в совокупности» К3 не выше 2.
 */
export function scoreTask25(r: AiTask25, opts: { sentences: number; joint: boolean }): Score25 {
  const j = r.justification
  let k1 = 0
  if (opts.sentences >= 2 && j.usesKnowledge) {
    if (j.causalLinks === 'full' && !j.hasErrors) k1 = 2
    else if (j.causalLinks !== 'none') k1 = 1
  }
  const k2 = r.items.length === 3 && r.items.every((x) => x.ok) ? 1 : 0
  const good = r.examples.filter((x) => x.ok).length
  const k3 = opts.joint && r.jointRequirementMet === false ? Math.min(good, 2) : good
  return { k1, k2, k3, total: k1 + k2 + k3 }
}
