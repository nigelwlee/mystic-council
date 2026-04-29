import { readFileSync } from "fs";
import { join } from "path";

export const FORMAT_RULES = readFileSync(join(process.cwd(), "lib/format.md"), "utf-8");

const CTA_RE = /\s*(let me know( if (you'?d? ?(like|want)|there('?s| are))?.{0,60})?|feel free to (ask|reach out).{0,60}|[^.!?]*\bfollow[- ]?up\b.{0,60})[.!]?\s*$/i;

function stripBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function stripCta(s: string): string {
  return s.replace(CTA_RE, "").trim();
}

function stripHeadings(s: string): string {
  return s.replace(/^#{1,6}\s+.+$/gm, "").trim();
}

function stripWrappingQuotes(s: string): string {
  return s.replace(/^["'"']+|["'"']+$/g, "").trim();
}

function collapseNewlines(s: string): string {
  // Multiple blank lines → single space; single newlines within a paragraph → space
  return s.replace(/\n{2,}/g, " ").replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
}

function stripEmDashes(s: string): string {
  // Em-dash (—) and en-dash (–) used as sentence breaks → period + capitalized continuation.
  // Hard enforcement: voice.md asks the model not to use them, but models still slip in ~10%.
  return s
    .replace(/\s*[—–]\s*([a-z])/g, (_m, c: string) => `. ${c.toUpperCase()}`)
    .replace(/\s*[—–]\s*([A-Z])/g, ". $1")
    .replace(/\s*[—–]\s*/g, ", ");
}

export function sanitizeField(s: string): string {
  let out = stripBold(s);
  out = stripHeadings(out);
  out = stripCta(out);
  out = stripWrappingQuotes(out);
  out = collapseNewlines(out);
  out = stripEmDashes(out);
  return out;
}
