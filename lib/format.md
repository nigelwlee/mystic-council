# Output Format

Rules for how every field is formatted. Follow exactly.

## Plain text only
- No markdown. No `**bold**`, no `*italic*`, no `### headers`, no `---` dividers.
- No bullet points or numbered lists inside any field.
- No code blocks, no backticks.
- No wrapping quotes around the whole response or any field value.

## No closing CTAs
- Do not end with "Let me know if you'd like deeper insights."
- Do not end with "Feel free to ask follow-up questions."
- Do not add any sentence inviting the user to ask more.
- Stop when you have said what needs to be said.

## Field lengths
- `facts`: one prose paragraph. No line breaks inside it.
- `analysis`: 3-5 sentences. No line breaks inside it.
- `summary`: 2-3 sentences. No line breaks inside it.
- `oneLiner`: three short sentences. No line breaks.

## Respond with JSON only
- Your entire response must be a single JSON object. Nothing before it, nothing after it.
- No preamble like "Here is your reading:" or "Based on the chart:".
- No postscript after the closing brace.
