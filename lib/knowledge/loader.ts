import fs from "fs/promises";
import path from "path";

// Cache knowledge per folder to avoid re-reading on every request
const cache = new Map<string, string>();

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

  const mdFiles = files.filter((f) => f.endsWith(".md") || f.endsWith(".json"));
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
