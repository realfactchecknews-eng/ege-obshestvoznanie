// Supabase Edge Function: проверка письменных заданий ЕГЭ (24, 25, эссе) через OpenAI.
//
// Ключ OpenAI хранится в секретах функции (OPENAI_API_KEY) и НИКОГДА не попадает на клиент.
// Развёртывание:
//   supabase functions deploy check-essay
//   supabase secrets set OPENAI_API_KEY=sk-...
//
// Клиент вызывает через supabase.functions.invoke('check-essay', { body: {...} }).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReqBody {
  taskNumber: number
  question: string
  answer: string
  criteria?: string[]
  modelAnswer?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    if (!OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY не настроен в секретах функции' }, 500)
    }

    const body = (await req.json()) as ReqBody
    if (!body?.answer?.trim()) {
      return json({ error: 'Пустой ответ ученика' }, 400)
    }

    const criteriaList = (body.criteria ?? []).map((c, i) => `${i + 1}. ${c}`).join('\n')

    const system = `Ты — опытный эксперт ЕГЭ по обществознанию, проверяющий часть 2 строго по критериям ФИПИ.
Оценивай ТОЛЬКО по приведённым критериям. Будь требователен, но справедлив, как реальный эксперт.
Отвечай СТРОГО валидным JSON без markdown по схеме:
{
  "perCriterion": [{ "criterion": "<текст критерия>", "met": true|false, "comment": "<кратко почему>" }],
  "score": <число набранных баллов = количество выполненных критериев>,
  "maxScore": <число критериев>,
  "overall": "<итоговый комментарий и как улучшить ответ, 2-4 предложения>"
}`

    const user = `ЗАДАНИЕ №${body.taskNumber}:
${body.question}

КРИТЕРИИ ОЦЕНИВАНИЯ:
${criteriaList || '(критерии не заданы — оцени содержательную полноту и корректность)'}

${body.modelAnswer ? `ЭТАЛОННЫЙ ОТВЕТ (для ориентира):\n${body.modelAnswer}\n` : ''}
ОТВЕТ УЧЕНИКА:
${body.answer}

Проверь ответ ученика по каждому критерию и верни JSON.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })

    if (!resp.ok) {
      const t = await resp.text()
      return json({ error: `OpenAI error: ${resp.status} ${t}` }, 502)
    }

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return json({ error: 'Не удалось разобрать ответ модели', raw: content }, 502)
    }

    return json(parsed, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
