export interface AiPlanResult {
  points: { reveals: boolean; comment?: string; twoSubsEnough?: boolean; subs: { ok: boolean; issue?: string; comment?: string }[] }[]
  formulationsCorrect: boolean
  formulationNotes?: string
  missing?: string[]
  advice?: string
}

export interface Score {
  k1: number
  k2: number
  total: number
  validPoints: number
  /** пункты, детализированные полностью (≥3 засчитанных подпунктов, или ≥2 если «возможны только два») */
  detailed: number
  perPoint: { reveals: boolean; okSubs: number; need: number; full: boolean }[]
}

/**
 * К1 (0–3) и К2 (0–1) по критериям ФИПИ-2026 из книги. Баллы считаем кодом из разбора модели,
 * а не просим модель назвать цифру — так результат объясним и стабилен.
 * Строка «2 балла через ≥3 пунктов, детализированных неполно» — моё прочтение плохо распознанного
 * текста критериев: три пункта с ≥2 засчитанными подпунктами, но не все дотягивают до нормы.
 */
export function scorePlan(r: AiPlanResult): Score {
  const perPoint = r.points.map((p) => {
    const okSubs = p.subs.filter((s) => s.ok).length
    const need = p.twoSubsEnough ? 2 : 3
    return { reveals: !!p.reveals, okSubs, need, full: !!p.reveals && okSubs >= need }
  })
  const validPoints = perPoint.filter((p) => p.reveals).length
  const detailed = perPoint.filter((p) => p.full).length
  const semi = perPoint.filter((p) => p.reveals && p.okSubs >= 2).length
  let k1 = 0
  if (validPoints >= 3) {
    if (detailed >= 3) k1 = 3
    else if (detailed === 2 || semi >= 3) k1 = 2
    else if (detailed === 1) k1 = 1
  }
  const k2 = k1 === 3 && r.formulationsCorrect ? 1 : 0
  return { k1, k2, total: k1 + k2, validPoints, detailed, perPoint }
}

