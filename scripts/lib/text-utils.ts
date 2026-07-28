// Cleanup for scraped titles/company names — the legacy RSS/API sources leave
// HTML entities un-decoded and sometimes dump multi-line document headers into
// the "company" field (e.g. ReliefWeb PDFs scraped as "INTRODUCTION\nActual Org Name").

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  nbsp: ' ',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

// The old scraper's source feeds double-decoded UTF-8 punctuation as "mojibake":
// a curly apostrophe (U+2019, UTF-8 bytes E2 80 99) re-read one byte at a time
// as Latin-1 becomes a 3-character sequence: the letter a-circumflex followed
// by two invisible C1 control characters — not the visible characters it looks
// like if pasted into an editor. En/em dashes, bullets, and curly quotes get
// the same treatment. ~32% of enhanced-jobs.json descriptions have this.
// Built from explicit char codes rather than pasted literal characters, since
// typing the mojibake directly risks the source file's own encoding silently
// re-mangling it.
const RIGHT_SINGLE_QUOTE = String.fromCharCode(226, 128, 153); // U+2019 mojibake -> '
const LEFT_SINGLE_QUOTE = String.fromCharCode(226, 128, 152); // U+2018 mojibake -> '
const RIGHT_DOUBLE_QUOTE = String.fromCharCode(226, 128, 157); // U+201D mojibake -> "
const LEFT_DOUBLE_QUOTE = String.fromCharCode(226, 128, 156); // U+201C mojibake -> "
const EN_DASH = String.fromCharCode(226, 128, 147); // U+2013 mojibake -> en dash
const EM_DASH = String.fromCharCode(226, 128, 148); // U+2014 mojibake -> em dash
const BULLET = String.fromCharCode(226, 128, 162); // U+2022 mojibake -> bullet
const NARROW_NBSP = String.fromCharCode(226, 128, 175); // U+202F mojibake -> space

const MOJIBAKE_SEQUENCES: [needle: string, replacement: string][] = [
  [RIGHT_SINGLE_QUOTE, "'"],
  [LEFT_SINGLE_QUOTE, "'"],
  [RIGHT_DOUBLE_QUOTE, '"'],
  [LEFT_DOUBLE_QUOTE, '"'],
  [EN_DASH, String.fromCharCode(8211)],
  [EM_DASH, String.fromCharCode(8212)],
  [BULLET, String.fromCharCode(8226)],
  [NARROW_NBSP, ' '],
];

/**
 * Some entries also lost the two control-character bytes entirely upstream
 * (e.g. "that" + a-circumflex + "s" instead of the full 3-char sequence) —
 * repaired by a narrower fallback pass scoped to common English contraction
 * endings, so real accented words (French "grace"/"tache", which legitimately
 * contain a-circumflex) are left alone.
 */
export function repairMojibake(input: string): string {
  let text = input;
  for (const [needle, replacement] of MOJIBAKE_SEQUENCES) {
    text = text.split(needle).join(replacement);
  }
  const orphanACircumflex = String.fromCharCode(226);
  text = text.replace(new RegExp(`([a-zA-Z])${orphanACircumflex}(s|t|d|m|ve|re|ll)\\b`, 'g'), "$1'$2");
  return text;
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(amp|nbsp|quot|apos|lt|gt);/g, (_, name) => NAMED_ENTITIES[name]);
}

const HEADER_LINE_WORDS = new Set(['introduction', 'background', 'about us', 'about', 'overview', 'summary']);

/** Cleans a scraped "company" field: decodes entities, and if it's a multi-line
 *  document dump, drops generic header lines and keeps the last real line. */
export function cleanCompanyName(raw: string | undefined | null): string {
  if (!raw) return 'Confidential Employer';
  const decoded = decodeHtmlEntities(repairMojibake(raw));
  const lines = decoded
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !HEADER_LINE_WORDS.has(l.toLowerCase()));
  const name = lines.length > 0 ? lines[lines.length - 1] : decoded.replace(/\s+/g, ' ').trim();
  return name || 'Confidential Employer';
}

// Some NGO/ReliefWeb feeds mix in procurement tenders and RFPs alongside real
// job postings — these aren't jobs and shouldn't be listed as such.
const NON_JOB_TITLE_PATTERN =
  /\btender\b|request for (proposal|quotation)s?|\brfp\b|\breoi\b|expression of interest|procurement of|supply,? installation|invitation to bid|\bitb\b|terms of reference|\btor\b|\(tor\)/i;

export function isLikelyNonJobListing(title: string): boolean {
  return NON_JOB_TITLE_PATTERN.test(title);
}
