import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

const CLASSIFY_SYSTEM = `You are an expert email analyst for client-facing teams. Your job is to identify emails that require attention from the recipient — specifically client questions, feedback, complaints, and action requests.

Respond ONLY with a valid JSON array. Do not include any explanation or markdown fencing.`;

export async function classifyEmails(emails) {
  if (!emails.length) return [];

  const emailList = emails.map((e, i) => ({
    index: i,
    subject: e.subject,
    sender: `${e.sender.name} <${e.sender.email}>`,
    receivedAt: e.receivedAt,
    bodyPreview: e.bodyPreview.slice(0, 500),
  }));

  const userMessage = `Analyse the following emails and identify any that contain client questions, feedback, complaints, or action requests that need a response.

For each email that needs attention, output an object in this exact JSON schema:
{
  "index": <number — matches the input index>,
  "needsAttention": true,
  "intentType": <"question" | "feedback" | "action_required" | "complaint">,
  "priority": <"high" | "medium" | "low">,
  "insight": <one sentence explaining what needs attention>,
  "replyOpener": <one sentence suggested reply opener>
}

For emails that do NOT need attention, output:
{ "index": <number>, "needsAttention": false }

Return a JSON array containing one object per email, preserving input order.

Emails:
${JSON.stringify(emailList, null, 2)}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0]?.text || '[]';

  let classifications;
  try {
    classifications = JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    classifications = match ? JSON.parse(match[0]) : [];
  }

  return emails.map((email, i) => {
    const cls = classifications.find((c) => c.index === i) || { needsAttention: false };
    return {
      ...email,
      needsAttention: cls.needsAttention ?? false,
      intentType: cls.intentType || null,
      priority: cls.priority || null,
      insight: cls.insight || null,
      replyOpener: cls.replyOpener || null,
    };
  });
}

export async function draftReply({ email, threadMessages, instruction }) {
  const threadContext = threadMessages?.length > 1
    ? `\n\nFull thread context (oldest to newest):\n${threadMessages
        .map((m) => `From: ${m.sender.name} <${m.sender.email}>\nDate: ${m.receivedAt}\n${stripHtml(m.body)}`)
        .join('\n\n---\n\n')}`
    : '';

  const userMessage = `Draft a professional, warm reply to the following client email.

Email:
Subject: ${email.subject}
From: ${email.sender.name} <${email.sender.email}>
Date: ${email.receivedAt}
Body: ${stripHtml(email.body || email.bodyPreview)}
${threadContext}
${instruction ? `\nAdditional instruction: ${instruction}` : ''}

Write a complete, ready-to-send reply. Start with a greeting. Keep it concise and professional. Do not include a subject line.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content[0]?.text || '';
}

export async function summariseThread(threadMessages) {
  const thread = threadMessages
    .map((m) => `From: ${m.sender.name} <${m.sender.email}>\nDate: ${m.receivedAt}\n${stripHtml(m.body)}`)
    .join('\n\n---\n\n');

  const userMessage = `Summarise this email thread clearly and concisely for someone who needs to respond.

Thread:
${thread}

Provide:
1. A 3–5 sentence plain-language summary of what has been discussed
2. A bullet list of key topics or outstanding items that still need to be addressed

Format your response as JSON: { "summary": "...", "outstandingItems": ["...", "..."] }`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0]?.text || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { summary: raw, outstandingItems: [] };
  }
}

export async function adviseOnEmail({ email, threadMessages }) {
  const threadContext = threadMessages?.length > 1
    ? `\n\nThread context:\n${threadMessages
        .map((m) => `From: ${m.sender.name}\nDate: ${m.receivedAt}\n${stripHtml(m.body).slice(0, 400)}`)
        .join('\n\n---\n\n')}`
    : '';

  const userMessage = `As a client relationship expert, provide strategic advice on how best to respond to this client email.

Email:
Subject: ${email.subject}
From: ${email.sender.name} <${email.sender.email}>
Intent: ${email.intentType || 'unclassified'}
Body: ${stripHtml(email.body || email.bodyPreview).slice(0, 800)}
${threadContext}

Provide:
1. Recommended tone and approach (2–3 sentences)
2. Key points to address in the reply (bullet list, 3–5 points)
3. What to avoid (1–2 sentences)

Format as JSON: { "approach": "...", "keyPoints": ["...", "..."], "avoid": "..." }`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0]?.text || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { approach: raw, keyPoints: [], avoid: '' };
  }
}

function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
