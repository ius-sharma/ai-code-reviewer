import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const PRIMARY_MODEL = "llama3-70b-8192";
const FALLBACK_MODEL = "llama-3.3-70b-versatile";

function getGroqErrorStatus(error) {
  const status =
    error?.status || error?.statusCode || error?.response?.status || null;

  if (typeof status === "number" && status >= 400 && status <= 599) {
    return status;
  }

  const code = error?.error?.error?.code || error?.code || "";

  if (/rate_limit/i.test(String(code))) {
    return 429;
  }

  if (/auth|api[_-]?key|unauthor/i.test(String(code))) {
    return 401;
  }

  return 502;
}

function getGroqErrorMessage(error, fallbackMessage) {
  const upstreamMessage =
    error?.error?.error?.message || error?.message || fallbackMessage;

  if (!upstreamMessage || typeof upstreamMessage !== "string") {
    return fallbackMessage;
  }

  return upstreamMessage.length > 200
    ? `${upstreamMessage.slice(0, 200)}...`
    : upstreamMessage;
}

function extractJsonObject(content) {
  if (!content || typeof content !== "string") {
    return null;
  }

  const fencedJsonMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedJsonMatch ? fencedJsonMatch[1] : content;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

function parseSuggestions(content) {
  if (!content || typeof content !== "string") {
    return [];
  }

  const parsedJson = extractJsonObject(content);
  if (parsedJson && Array.isArray(parsedJson.suggestions)) {
    return parsedJson.suggestions
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return content
    .split("\n")
    .filter((line) => !/```/.test(line))
    .filter((line) => !/code\s*quality\s*score/i.test(line))
    .filter((line) => !/^\s*\{\s*$/.test(line))
    .filter((line) => !/^\s*\}\s*$/.test(line))
    .filter((line) => !/^\s*"?(score|fixedCode)"?\s*:/i.test(line))
    .filter((line) => !/^\s*"?suggestions"?\s*:/i.test(line))
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, "").trim())
    .filter((line) => !/^\*\*.*\*\*$/.test(line))
    .filter(Boolean);
}

function parseScore(content) {
  if (!content || typeof content !== "string") {
    return null;
  }

  const parsedJson = extractJsonObject(content);
  if (parsedJson && typeof parsedJson.score === "number") {
    return Math.max(0, Math.min(100, parsedJson.score));
  }

  const scoreMatch = content.match(
    /code\s*quality\s*score\s*[:\-]?\s*(\d{1,3})/i,
  );
  if (!scoreMatch) {
    return null;
  }

  const parsed = Number.parseInt(scoreMatch[1], 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, parsed));
}

function parseFixedCode(content, originalCode) {
  if (!content || typeof content !== "string") {
    return originalCode;
  }

  const parsedJson = extractJsonObject(content);
  if (
    parsedJson &&
    typeof parsedJson.fixedCode === "string" &&
    parsedJson.fixedCode.trim()
  ) {
    return parsedJson.fixedCode;
  }

  const codeBlockMatches = [
    ...content.matchAll(/```(\w+)?\s*\n([\s\S]*?)```/g),
  ];
  if (codeBlockMatches.length > 0) {
    const nonJsonBlock = codeBlockMatches
      .map((match) => ({
        language: (match[1] || "").toLowerCase(),
        body: (match[2] || "").trim(),
      }))
      .filter((block) => block.body)
      .find((block) => block.language !== "json");

    if (nonJsonBlock) {
      return nonJsonBlock.body;
    }
  }

  const fixedCodeMatch = content.match(/fixedCode\s*[:=]\s*([\s\S]*)/i);
  if (fixedCodeMatch?.[1]?.trim()) {
    return fixedCodeMatch[1].trim();
  }

  return originalCode;
}

export const analyzeCode = async (req, res) => {
  const { code, language } = req.body ?? {};

  if (typeof code !== "string" || typeof language !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid request body. 'code' and 'language' must be strings.",
    });
  }

  if (!code.trim() || !language.trim()) {
    return res.status(400).json({
      success: false,
      message: "Both 'code' and 'language' are required.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "Missing GROQ_API_KEY environment variable.",
    });
  }

  try {
    const prompt = `You are a senior software engineer.

Analyze the given ${language} code and respond in this exact structure:

1. Explanation:
- Brief explanation of what the code does.

2. Issues / Bugs:
- Identify logical errors, bad practices, and possible bugs.
- Mention line references when possible (e.g., "Line 12").

3. Improvements:
- Suggest better approaches, optimizations, and clean code practices.

4. Improved Code:
- Provide a cleaner, optimized version of the code.

Output requirements:
- Keep the response concise, structured, and developer-friendly.
- Use bullet points for sections 1-3.
- Put ONLY sections 1-3 into the "suggestions" array in order.
- Put section 4 code into "fixedCode" only.
- Return a realistic code quality score from 0-100.

Return ONLY valid JSON with this exact shape:
{
  "score": number,
  "suggestions": string[],
  "fixedCode": string
}

Code:
${code}`;

    let completion;

    try {
      completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      });
    } catch (error) {
      if (error?.error?.error?.code === "model_decommissioned") {
        completion = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        });
      } else {
        throw error;
      }
    }

    const llmOutput = completion.choices?.[0]?.message?.content ?? "";
    const score = parseScore(llmOutput) ?? 75;
    const suggestions = parseSuggestions(llmOutput);
    const fixedCode = parseFixedCode(llmOutput, code);

    return res.status(200).json({
      success: true,
      score,
      suggestions,
      fixedCode,
    });
  } catch (error) {
    console.error("Groq analysis failed:", error);
    return res.status(getGroqErrorStatus(error)).json({
      success: false,
      message: getGroqErrorMessage(error, "Failed to analyze code."),
    });
  }
};

export const explainCode = async (req, res) => {
  const { code, language } = req.body ?? {};

  if (typeof code !== "string" || typeof language !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid request body. 'code' and 'language' must be strings.",
    });
  }

  if (!code.trim() || !language.trim()) {
    return res.status(400).json({
      success: false,
      message: "Both 'code' and 'language' are required.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "Missing GROQ_API_KEY environment variable.",
    });
  }

  try {
    const prompt = `You are a senior software engineer and teacher.

Explain the following code in concise, informative sections.

Use exactly these headings and keep content brief:
1. Explanation
2. Issues / Bugs
3. Suggestions / Improvements

Formatting rules:
- Under each heading, use bullet points only.
- Keep bullets clear, practical, and non-redundant.
- Avoid long paragraphs.

Language: ${language}

Code:
${code}`;

    let completion;

    try {
      completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      });
    } catch (error) {
      if (error?.error?.error?.code === "model_decommissioned") {
        completion = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        });
      } else {
        throw error;
      }
    }

    const explanation = completion.choices?.[0]?.message?.content?.trim() ?? "";

    return res.status(200).json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error("Groq explanation failed:", error);
    return res.status(getGroqErrorStatus(error)).json({
      success: false,
      message: getGroqErrorMessage(error, "Failed to explain code."),
    });
  }
};

export const chatCode = async (req, res) => {
  const { code, language, question } = req.body ?? {};

  if (
    typeof code !== "string" ||
    typeof language !== "string" ||
    typeof question !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request body. 'code', 'language', and 'question' must be strings.",
    });
  }

  if (!code.trim() || !language.trim() || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: "'code', 'language', and 'question' are required.",
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      message: "Missing GROQ_API_KEY environment variable.",
    });
  }

  try {
    const prompt = `You are a senior software engineer.

The user will ask questions about the following code.

Code:
${code}

Answer the question clearly and concisely.

Question:
${question}`;

    let completion;

    try {
      completion = await groq.chat.completions.create({
        model: PRIMARY_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      });
    } catch (error) {
      if (error?.error?.error?.code === "model_decommissioned") {
        completion = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
        });
      } else {
        throw error;
      }
    }

    const answer = completion.choices?.[0]?.message?.content?.trim() ?? "";

    return res.status(200).json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("Groq chat failed:", error);
    return res.status(getGroqErrorStatus(error)).json({
      success: false,
      message: getGroqErrorMessage(error, "Failed to chat with code."),
    });
  }
};
