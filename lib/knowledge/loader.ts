import fs from "fs/promises";
import path from "path";

// Cache knowledge per folder to avoid re-reading on every request
const cache = new Map<string, string>();
const promptCache = new Map<string, string>();

export async function loadKnowledge(expertFolder: string): Promise<string> {
  if (cache.has(expertFolder)) {
    return cache.get(expertFolder)!;
  }

  const dir = path.join(process.cwd(), "knowledge", expertFolder);

  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return "";
  }

  const mdFiles = files.filter(
    (f) =>
      (f.endsWith(".md") || f.endsWith(".json")) &&
      !f.startsWith("system-prompt")
  );
  const contents = await Promise.all(
    mdFiles.sort().map(async (f) => {
      const content = await fs.readFile(path.join(dir, f), "utf-8");
      const title = f.replace(/\.(md|json)$/, "").replace(/-/g, " ");
      return `## ${title}\n${content}`;
    })
  );

  const result = contents.join("\n\n---\n\n");
  cache.set(expertFolder, result);
  return result;
}

export async function loadSystemPrompt(
  expertFolder: string,
  variant?: string
): Promise<string> {
  const filename = variant
    ? `system-prompt-${variant}.md`
    : "system-prompt.md";
  const cacheKey = `${expertFolder}/${filename}`;

  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  const filePath = path.join(
    process.cwd(),
    "knowledge",
    expertFolder,
    filename
  );

  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    throw new Error(`System prompt not found: knowledge/${cacheKey}`);
  }

  promptCache.set(cacheKey, content);
  return content;
}
