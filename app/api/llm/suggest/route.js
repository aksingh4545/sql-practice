import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { schema } = await request.json();
    if (!schema) {
      return NextResponse.json({ error: 'Database schema is required' }, { status: 400 });
    }

    const apiKey = process.env.SQL_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key (SQL_KEY) is missing in environment' }, { status: 500 });
    }

    const systemPrompt = `You are an expert SQL teacher. Given a database schema and sample data, your task is to generate a list of 5 interesting and educational SQL practice questions of varying difficulty (Easy, Medium, Hard).
The questions should match the schema and be useful for learning database queries.

Format your response as a JSON array of objects. Do not include markdown code block formatting (like \`\`\`json) or any conversational text around the JSON. Return ONLY the raw JSON string matching this exact schema:
[
  {
    "id": 1,
    "title": "Brief title of the challenge",
    "question": "The question/prompt describing what to query",
    "difficulty": "Easy" | "Medium" | "Hard",
    "suggestedQuery": "The correct SQL query to solve it",
    "hint": "A helpful teaching hint to guide them (without giving away the full answer)"
  },
  ...
]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the current database schema:\n\n${schema}` }
        ],
        temperature: 0.7,
        max_tokens: 1524
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Groq error: ${response.status} - ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    let cleanText = data.choices[0].message.content.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const suggestions = JSON.parse(cleanText);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
