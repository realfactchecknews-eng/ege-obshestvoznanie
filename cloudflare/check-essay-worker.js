/**
 * Cloudflare Worker: ИИ-проверка письменных заданий ЕГЭ через OpenRouter.
 * Ключ OpenRouter хранится в секрете Worker'а (OPENROUTER_API_KEY) и на клиент не попадает.
 *
 * Деплой (одноразово):
 *   1. npm install -g wrangler && wrangler login
 *   2. cd cloudflare && wrangler deploy check-essay-worker.js --name ege-check-essay
 *   3. wrangler secret put OPENROUTER_API_KEY --name ege-check-essay   (вставить ключ sk-or-...)
 *   4. URL воркера (https://ege-check-essay.<аккаунт>.workers.dev) прописать
 *      в client/.env.local и в GitHub Secrets как VITE_AI_ENDPOINT.
 */

const MODEL = 'deepseek/deepseek-chat' // дёшево и хорошо для русского; можно заменить
// Модель для структурных разборов (план №24, задание №25) (дёшево и быстро; DeepSeek на этом JSON тормозил 40–80 с); переопределяется переменной STRUCT_MODEL
const STRUCT_MODEL = 'openai/gpt-4o-mini'

// Максимальные баллы по заданиям части 2 (ЕГЭ обществознание 2026)
const MAX_SCORES = { 17: 2, 18: 2, 19: 3, 20: 3, 21: 3, 22: 4, 23: 3, 24: 4, 25: 6 }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (request.method !== 'POST') {
      return json({ error: 'Only POST' }, 405)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Bad JSON' }, 400)
    }

    if (body.mode === 'plan24') return checkPlan24(body, env)
    if (body.mode === 'task25') return checkTask25(body, env)

    const { taskNumber, question, answer, criteria, modelAnswer } = body
    if (!question || !answer) return json({ error: 'Нужны question и answer' }, 400)
    if (String(answer).length > 8000) return json({ error: 'Ответ слишком длинный' }, 400)

    const maxScore = MAX_SCORES[taskNumber] ?? 3
    const criteriaText = Array.isArray(criteria) && criteria.length
      ? criteria.join('\n\n')
      : '(официальные критерии не переданы — оцени по стандартным требованиям ФИПИ к этому номеру)'

    const prompt = `Ты — эксперт ЕГЭ по обществознанию, проверяешь задание №${taskNumber} части 2.

ЗАДАНИЕ:
${question}

${modelAnswer ? `ЭТАЛОННЫЙ ОТВЕТ/ЭЛЕМЕНТЫ ОТВЕТА:\n${modelAnswer}\n` : ''}
ОФИЦИАЛЬНЫЕ КРИТЕРИИ ОЦЕНИВАНИЯ:
${criteriaText}

ОТВЕТ УЧЕНИКА:
${answer}

Максимальный балл за задание: ${maxScore}.
Оцени ответ строго по критериям, как реальный эксперт ФИПИ. Верни ТОЛЬКО валидный JSON без пояснений вокруг:
{"perCriterion":[{"criterion":"краткое название требования","met":true|false,"comment":"почему зачтено/не зачтено, 1-2 предложения"}],"score":число,"maxScore":${maxScore},"overall":"общий вывод и главный совет ученику, 2-3 предложения"}`

    try {
      const parsed = await askModel(env, prompt)
      parsed.maxScore = maxScore
      parsed.score = Math.max(0, Math.min(maxScore, Number(parsed.score) || 0))
      return json(parsed)
    } catch (e) {
      return json({ error: e.message }, 502)
    }
  },
}

async function askModel(env, prompt, model) {
  // модель иногда отвечает пусто/не JSON-ом или зависает — один повтор и таймаут на каждый заход
  let lastErr = 'ИИ не ответил'
  for (let attempt = 0; attempt < 2; attempt++) {
    let content = ''
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || env.MODEL || MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(40000),
      })
      if (!resp.ok) {
        lastErr = `OpenRouter: ${resp.status} ${(await resp.text()).slice(0, 200)}`
        continue
      }
      const data = await resp.json()
      content = data.choices?.[0]?.message?.content ?? ''
    } catch {
      lastErr = 'ИИ не успел ответить, попробуй ещё раз'
      continue
    }
    try {
      // модель может обернуть JSON в ```json ... ``` или добавить текст вокруг
      let txt = content.trim()
      const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) txt = fence[1].trim()
      const a = txt.indexOf('{')
      const b = txt.lastIndexOf('}')
      if (a >= 0 && b > a) txt = txt.slice(a, b + 1)
      return JSON.parse(txt)
    } catch {
      lastErr = 'ИИ вернул невалидный JSON: ' + content.slice(0, 150)
    }
  }
  throw new Error(lastErr)
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

// ---------- №24: сложный план (К1 раскрытие темы 0–3, К2 корректность 0–1) ----------
const PLAN_RULES = `Критерии ЕГЭ-2026 по заданию 24 (сложный план):
К1 (0–3): учитываются соответствие плану сложного типа; наличие пунктов, НЕПОСРЕДСТВЕННО раскрывающих тему по существу; количество подпунктов каждого пункта; корректность формулировок.
Нужно не менее трёх пунктов, непосредственно раскрывающих тему, детализированных в подпунктах, раскрывающих заявленный аспект. Подпунктов в каждом детализированном пункте — не менее трёх, кроме случаев, когда с точки зрения общественных наук возможны только два.
Пункты и подпункты абстрактно-формального характера, не отражающие специфики темы и не раскрывающие её по существу (например «Понятие», «Значение», «Роль в жизни общества», «Проблемы и пути решения» без конкретики), НЕ засчитываются.
К2 (0–1): формулировки пунктов и подпунктов корректны, без ошибок и неточностей; ставится только при К1 = 3.
Допускаются иные формулировки, не искажающие смысла. Эталонный план — лишь ориентир, не единственно верный вариант.`

async function checkPlan24(body, env) {
  const { topic, plan, reference } = body
  if (!topic || !Array.isArray(plan) || !plan.length) return json({ error: 'Нужны topic и plan' }, 400)
  if (plan.length > 12 || plan.some((p) => !p || !Array.isArray(p.subs) || p.subs.length > 10)) {
    return json({ error: 'Слишком большой план' }, 400)
  }
  const cut = (x) => String(x ?? '').slice(0, 250)
  const planText = plan
    .map((p, i) => `${i + 1}. ${cut(p.title)}\n` + p.subs.map((s, j) => `   ${String.fromCharCode(1072 + j)}) ${cut(s)}`).join('\n'))
    .join('\n')
  const refText = Array.isArray(reference) && reference.length
    ? reference.map((p, i) => `${i + 1}. ${cut(p.title)}: ${(p.subs || []).map(cut).join('; ')}`).join('\n')
    : ''

  const prompt = `Ты — строгий эксперт ЕГЭ по обществознанию, проверяешь задание 24. Тема: «${cut(topic)}».

${PLAN_RULES}

${refText ? `ЭТАЛОННЫЙ ПЛАН-ОРИЕНТИР (не обязателен буквально):\n${refText}\n\n` : ''}ПЛАН УЧЕНИКА (пункты пронумерованы цифрами, подпункты буквами):
${planText}

Оцени КАЖДЫЙ пункт и КАЖДЫЙ подпункт по отдельности. Будь строг, но справедлив, как реальный эксперт ФИПИ. Незасчитанным считай подпункт, который: пустая общая фраза без содержания («важная», «большая роль»); не относится к своему пункту; повторяет другой подпункт по смыслу; фактически неверен. НЕ придирайся к самим названиям пунктов: типовые аспекты темы (признаки, виды, функции, причины, пути решения, правовое регулирование, формы, структура) засчитывай, если подпункты под ними содержательны и конкретны; аспект может относиться к теме не буквально, а как её естественная часть.
Верни ТОЛЬКО JSON без пояснений вокруг:
{"points":[{"reveals":true|false,"comment":"1 короткое предложение","twoSubsEnough":true|false,"subs":[{"ok":true|false,"issue":"none|abstract|offtopic|duplicate|wrong|general","comment":"коротко, только если ok=false"}]}],"formulationsCorrect":true|false,"formulationNotes":"какие именно формулировки некорректны, или пустая строка","missing":["важные аспекты темы, которых не хватает, до 3 штук"],"advice":"главный совет ученику, 2 предложения"}
"reveals" — пункт непосредственно раскрывает тему по существу (не абстрактно-формальный). "twoSubsEnough" — true, только если для этого пункта с точки зрения науки возможны лишь два подпункта. Массив points и массивы subs должны точно соответствовать плану ученика по порядку и длине.`

  try {
    const r = await askModel(env, prompt, env.STRUCT_MODEL || STRUCT_MODEL)
    if (!Array.isArray(r.points) || r.points.length !== plan.length) throw new Error('ИИ вернул разбор не по всем пунктам, попробуй ещё раз')
    return json(r)
  } catch (e) {
    return json({ error: e.message }, 502)
  }
}

// ---------- №25: обоснование (К1 0–2) + ответ на вопрос (К2 0–1) + три примера (К3 0–3) ----------
const T25_RULES = `Критерии ЕГЭ-2026 по заданию 25 (максимум 6 баллов):
К1 «Обоснование» (0–2): 2 — корректное обоснование с опорой на обществоведческие знания в нескольких распространённых предложениях, без ошибок и неточностей, раскрывает причинно-следственные и (или) функциональные связи; 1 — в целом корректное, но с отдельными неточностями, не искажающими сути, И/ИЛИ связи раскрыты не полностью; 0 — одно предложение или словосочетание, обоснование без опоры на обществоведческие знания (на бытовом уровне).
К2 «Ответ на вопрос» (0–1): 1 — названо необходимое количество объектов (три), все позиции верны, неверных нет.
К3 «Примеры» (0–3): по баллу за каждый правильный пример, который сформулирован развёрнуто и соответствует всем требованиям задания (в скобках: «развёрнуто», «не дублировать», «указать результат/цель», «в совокупности разные функции/права/принципы» и т. п.). Пример-общая фраза без конкретной ситуации, не соответствующий своему объекту из п. 2, дублирующий другой или фактически неверный — не засчитывается.`

async function checkTask25(body, env) {
  const { taskText, justification, items, examples } = body
  const okArr = (a) => Array.isArray(a) && a.length === 3 && a.every((x) => typeof x === 'string')
  if (!taskText || typeof justification !== 'string' || !okArr(items) || !okArr(examples)) {
    return json({ error: 'Нужны taskText, justification, items[3], examples[3]' }, 400)
  }
  if (justification.length > 3000 || items.some((x) => x.length > 300) || examples.some((x) => x.length > 1500)) {
    return json({ error: 'Слишком длинный ответ' }, 400)
  }
  const prompt = `Ты — строгий, но справедливый эксперт ЕГЭ по обществознанию, проверяешь задание 25.

${T25_RULES}

ЗАДАНИЕ:
${String(taskText).slice(0, 2500)}

ОТВЕТ УЧЕНИКА
Пункт 1 (обоснование):
${justification}

Пункт 2 (три позиции):
${items.map((x, i) => `${i + 1}. ${x}`).join('\n')}

Пункт 3 (примеры; i-й пример относится к i-й позиции пункта 2):
${examples.map((x, i) => `${i + 1}. ${x}`).join('\n')}

Проверь по критериям и условиям задания, включая все требования в скобках. Не придирайся к стилю, оценивай содержание. Если позиция в п. 2 неверна или пуста, соответствующий пример не засчитывай. Верни ТОЛЬКО JSON без пояснений вокруг:
{"justification":{"usesKnowledge":true|false,"causalLinks":"full|partial|none","hasErrors":true|false,"comment":"что хорошо и чего не хватает, 1–2 предложения"},"items":[{"ok":true|false,"comment":"только если ok=false, коротко"},{...},{...}],"examples":[{"ok":true|false,"issue":"none|not_developed|mismatch|duplicate|wrong|requirement","comment":"только если ok=false, коротко"},{...},{...}],"jointRequirementMet":true|false,"advice":"главный совет ученику, 2 предложения"}
"usesKnowledge" — есть опора на обществоведческие понятия и знания, а не бытовые рассуждения. "causalLinks": full — связи раскрыты полно, partial — частично, none — нет связей. "hasErrors" — есть ошибки или неточности. "jointRequirementMet" — выполнено ли требование «в совокупности» (разные функции/права/принципы, разные примеры); если такого требования в задании нет — true. items и examples — ровно по три элемента.`
  try {
    const r = await askModel(env, prompt, env.STRUCT_MODEL || STRUCT_MODEL)
    if (!r.justification || !Array.isArray(r.items) || r.items.length !== 3 || !Array.isArray(r.examples) || r.examples.length !== 3) {
      throw new Error('ИИ вернул неполный разбор, попробуй ещё раз')
    }
    return json(r)
  } catch (e) {
    return json({ error: e.message }, 502)
  }
}
