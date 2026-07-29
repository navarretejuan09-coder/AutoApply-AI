import { SKILL_VOCABULARY } from "./skill-vocabulary.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSkillPattern(skill: string): RegExp {
  const escaped = escapeRegExp(skill);
  return new RegExp(`(?<![\\w])${escaped}(?![\\w])`, "i");
}

const SKILL_PATTERNS = SKILL_VOCABULARY.map((skill) => ({
  skill,
  pattern: buildSkillPattern(skill),
}));

export function extractSkills(text: string): string[] {
  const normalizedText = text.replace(/\s+/g, " ");
  const found = new Set<string>();

  for (const { skill, pattern } of SKILL_PATTERNS) {
    if (pattern.test(normalizedText)) {
      found.add(skill);
    }
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}
