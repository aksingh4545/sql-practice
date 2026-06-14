import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message, schema, currentQuery, history, queryError } = await request.json();

    const apiKey = process.env.SQL_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key (SQL_KEY) is missing in environment' }, { status: 500 });
    }

    const systemPrompt = `You are a helpful, encouraging, and expert SQL Tutor. Your goal is to help the user write correct SQL queries and understand SQL concepts through a "teaching tone".
Guidelines for your response:
1. Be educational, friendly, and structured. Break down concepts, explain what clauses do, and why they are used.
2. Address the user's specific question or query error if provided.
3. Use the current database schema context below to make your code examples accurate and relevant.
4. Output your explanations in clean, beautifully structured HTML/Markdown. Do not just spit out code; explain the logic first or alongside.
5. If the user's current query has an error, gently explain what went wrong and how to fix it.
6. Provide the corrected/suggested SQL query inside a markdown code block (e.g. \`\`\`sql ... \`\`\`) so the UI can detect and format it, and offer a "Use Query" button.

Current Database Schema:
${schema}

${currentQuery ? `User's current query in editor: \n\`\`\`sql\n${currentQuery}\n\`\`\`` : ''}
${queryError ? `The error returned by the SQL engine: \n"${queryError}"` : ''}
`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (history && Array.isArray(history)) {
      history.forEach(h => {
        messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
      });
    }

    messages.push({ role: 'user', content: message || 'Please analyze my query or schema and give me some guidance.' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.3,
        max_tokens: 1524
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Groq error: ${response.status} - ${errText}` }, { status: response.status });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
