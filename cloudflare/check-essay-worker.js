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

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const t = await resp.text()
      return json({ error: `OpenRouter: ${resp.status} ${t.slice(0, 200)}` }, 502)
    }

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content ?? ''
    try {
      // модель может обернуть JSON в ```json ... ``` или добавить текст вокруг
      let txt = content.trim()
      const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fence) txt = fence[1].trim()
      const start = txt.indexOf('{')
      const end = txt.lastIndexOf('}')
      if (start >= 0 && end > start) txt = txt.slice(start, end + 1)
      const parsed = JSON.parse(txt)
      parsed.maxScore = maxScore
      parsed.score = Math.max(0, Math.min(maxScore, Number(parsed.score) || 0))
      return json(parsed)
    } catch {
      return json({ error: 'ИИ вернул невалидный JSON: ' + content.slice(0, 150) }, 502)
    }
  },
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}
