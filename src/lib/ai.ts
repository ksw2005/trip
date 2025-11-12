// src/lib/ai.ts
import 'server-only';

type GenOpts = { prompt: string; json?: boolean };

export async function generateText({ prompt, json = false }: GenOpts): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('Missing AI_API_KEY in environment variables');

  // --- Google AI Studio (Gemini) ---
  if (provider === 'google' || provider === 'gemini') {
    const model = process.env.GOOGLE_MODEL || 'gemini-2.5-flash';
    const url =
      `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent` +
      `?key=${encodeURIComponent(key)}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };
    
    // Google Gemini는 generationConfig에서 JSON을 강제할 수 없으므로
    // 프롬프트에서 JSON 형식을 명시하는 방식 사용
    // json 옵션은 다른 프로바이더를 위해 유지

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Google AI error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ?? '';
    return text;
  }


  // --- OpenAI ---
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // --- Anthropic ---
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? (data.content.find((b: any) => b.type === 'text')?.text ?? '')
      : '';
    return text;
  }

  // --- Together ---
  if (provider === 'together') {
    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3-8b-chat-hf',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`Together AI API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // --- Perplexity ---
  if (provider === 'perplexity') {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });
    if (!res.ok) throw new Error(`Perplexity API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  throw new Error(
    `Unsupported AI_PROVIDER: ${provider}. Supported: google/gemini, openai, anthropic, together, perplexity`
  );
}
