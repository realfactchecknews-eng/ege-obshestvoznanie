// Проверка подсчёта К1/К2/К3: node scripts/check-task25.mjs
import assert from 'node:assert/strict'
import { scoreTask25, countSentences, jointRequired } from '../src/lib/task25score.ts'

const ex = (oks) => oks.map((ok) => ({ ok }))
const it = (oks) => oks.map((ok) => ({ ok }))
const R = (j, items, examples, joint) => ({ justification: { usesKnowledge: true, causalLinks: 'full', hasErrors: false, ...j }, items: it(items), examples: ex(examples), jointRequirementMet: joint })
const S = (r, o = {}) => scoreTask25(r, { sentences: 4, joint: false, ...o })

assert.equal(S(R({}, [1, 1, 1], [1, 1, 1])).total, 6, 'идеал: 6')
assert.equal(S(R({ hasErrors: true }, [1, 1, 1], [1, 1, 1])).k1, 1, 'ошибки в обосновании: К1=1')
assert.equal(S(R({ causalLinks: 'partial' }, [1, 1, 1], [1, 1, 1])).k1, 1, 'связи неполные: К1=1')
assert.equal(S(R({ causalLinks: 'none' }, [1, 1, 1], [1, 1, 1])).k1, 0, 'нет связей: К1=0')
assert.equal(S(R({ usesKnowledge: false }, [1, 1, 1], [1, 1, 1])).k1, 0, 'бытовой уровень: К1=0')
assert.equal(S(R({}, [1, 1, 1], [1, 1, 1]), { sentences: 1 }).k1, 0, 'одно предложение: К1=0')
assert.equal(S(R({}, [1, 1, 0], [1, 1, 0])).k2, 0, 'одна позиция неверна: К2=0')
assert.equal(S(R({}, [1, 1, 0], [1, 1, 0])).k3, 2, 'два верных примера: К3=2')
assert.equal(S(R({}, [1, 1, 1], [0, 0, 0])).k3, 0)
assert.equal(S(R({}, [1, 1, 1], [1, 1, 1], false), { joint: true }).k3, 2, 'не выполнено «в совокупности»: К3 ≤ 2')
assert.equal(S(R({}, [1, 1, 1], [1, 1, 1], false), { joint: false }).k3, 3, 'требования нет — флаг модели игнорируем')
assert.equal(countSentences('Первое предложение здесь. Второе предложение тоже тут.'), 2)
assert.equal(countSentences('Всего одно предложение без точки'), 1)
assert.ok(jointRequired('В совокупности примеры должны иллюстрировать три функции'))
assert.ok(!jointRequired('Каждый пример должен быть сформулирован развёрнуто.'))
console.log('task25: все проверки пройдены')
