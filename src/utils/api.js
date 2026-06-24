export async function fetchFromLLM(config, userMessage, systemPrompt, isJson = false, images = [], maxTokens = 4096) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    if (config.format === 'google') {
      let endpoint = config.url.endsWith('/') ? config.url : config.url + '/';
      endpoint += `${config.model}:generateContent?key=${config.apiKey}`;

      const parts = images.map(img => ({ inline_data: { mime_type: img.type, data: img.b64 } }));
      parts.push({ text: `System: ${systemPrompt}\nUser: ${userMessage}` });

      const body = {
        contents: [{ role: "user", parts: parts }],
        generationConfig: { temperature: 0.9, maxOutputTokens: maxTokens }
      };
      if (isJson) body.generationConfig.responseMimeType = "application/json";

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Google API Error");
      return data.candidates[0].content.parts[0].text;

    } else {
      const contentArray = images.map(img => ({ type: "image_url", image_url: { url: `data:${img.type};base64,${img.b64}` } }));
      contentArray.push({ type: "text", text: userMessage });

      const body = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contentArray }
        ],
        temperature: 0.9,
        max_tokens: maxTokens
      };
      if (isJson && config.model.toLowerCase().includes('gpt')) {
        body.response_format = { type: "json_object" };
      }

      const headers = {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Karakter Maker App'
      };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      const res = await fetch(config.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error?.metadata?.raw || "Proxy API Error");
      return data.choices[0].message.content;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("Timeout 60 detik. Server AI kepenuhan atau menolak prompt.");
    }
    throw err;
  }
}