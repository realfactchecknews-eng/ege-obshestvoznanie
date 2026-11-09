// Проверка подсчёта К1/К2: node scripts/check-plan24.mjs
import assert from 'node:assert/strict'
import { scorePlan } from '../src/lib/plan24score.ts'

const pt = (reveals, ok, extra = {}) => ({ reveals, subs: Array.from({ length: ok }, () => ({ ok: true })), ...extra })
const s = (points, formulationsCorrect = true) => scorePlan({ points, formulationsCorrect })

assert.equal(s([pt(1, 3), pt(1, 3), pt(1, 3)]).total, 4, 'идеал: К1=3, К2=1')
assert.equal(s([pt(1, 3), pt(1, 3), pt(1, 3)], false).total, 3, 'формулировки с ошибками: К2=0')
assert.equal(s([pt(1, 3), pt(1, 3), pt(1, 1)]).k1, 2, 'два пункта детализированы')
assert.equal(s([pt(1, 3), pt(1, 1), pt(1, 0)]).k1, 1, 'один пункт детализирован')
assert.equal(s([pt(1, 3), pt(1, 3), pt(0, 3)]).k1, 0, 'меньше трёх раскрывающих пунктов: 0')
assert.equal(s([pt(1, 2), pt(1, 2), pt(1, 2)]).k1, 2, 'три пункта по два подпункта: 2')
assert.equal(s([pt(1, 2, { twoSubsEnough: true }), pt(1, 3), pt(1, 3)]).k1, 3, 'два подпункта допустимы, если больше невозможно')
assert.equal(s([pt(1, 3), pt(1, 3), pt(1, 3), pt(0, 0)]).k1, 3, 'лишний слабый пункт не мешает')
assert.equal(s([pt(1, 3), pt(1, 3)]).k1, 0, 'всего два пункта')
console.log('plan24: все проверки пройдены')
