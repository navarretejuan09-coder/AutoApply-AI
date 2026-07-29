const SUMMARY_MAX_LENGTH = 500;

export function summarizeText(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= SUMMARY_MAX_LENGTH) {
    return cleaned;
  }

  const truncated = cleaned.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > SUMMARY_MAX_LENGTH * 0.6) {
    return `${truncated.slice(0, lastSpace).trim()}…`;
  }

  return `${truncated.trim()}…`;
}
