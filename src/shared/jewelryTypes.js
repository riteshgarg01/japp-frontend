export const JEWELLERY_STYLE_OPTIONS = [
  "American Diamond",
  "Antique Gold Plated",
  "Beaded",
  "German Silver",
  "Kundan",
  "Meenakari",
  "Mirror Work",
  "Moissanite",
  "Oxidized Silver",
  "Pearl",
  "Polki",
  "Rose Gold Plated",
  "Temple",
  "Terracotta",
  "Thread Work",
];

const STYLE_LOOKUP = new Map(JEWELLERY_STYLE_OPTIONS.map((label) => [label.toLowerCase(), label]));
const STYLE_SYNONYMS = new Map(
  Object.entries({
    "ad": "American Diamond",
    "cz": "American Diamond",
    "cz stone": "American Diamond",
    "american diamond (ad)": "American Diamond",
    "oxidised": "Oxidized Silver",
    "oxidized": "Oxidized Silver",
    "oxidized silver": "Oxidized Silver",
    "oxidised silver": "Oxidized Silver",
    "kundan work": "Kundan",
    "polki work": "Polki",
    "meenakari work": "Meenakari",
    "mirror": "Mirror Work",
    "mirror work": "Mirror Work",
    "beads": "Beaded",
    "beaded": "Beaded",
    "thread": "Thread Work",
    "thread work": "Thread Work",
    "temple jewellery": "Temple",
    "temple jewelry": "Temple",
    "german silver": "German Silver",
    "antique gold": "Antique Gold Plated",
    "antique finish": "Antique Gold Plated",
    "rose gold": "Rose Gold Plated",
    "pearl work": "Pearl",
    "terracotta": "Terracotta",
    "moissanite": "Moissanite",
  }),
);

export function normalizeStyleTag(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (["not specified","unspecified","n/a","na","none"].includes(lower)) return null;
  if (STYLE_SYNONYMS.has(lower)) return STYLE_SYNONYMS.get(lower);
  if (STYLE_LOOKUP.has(lower)) return STYLE_LOOKUP.get(lower);
  const simplified = lower.replace(/jewell?ery/g, "").trim();
  if (STYLE_SYNONYMS.has(simplified)) return STYLE_SYNONYMS.get(simplified);
  if (STYLE_LOOKUP.has(simplified)) return STYLE_LOOKUP.get(simplified);
  for (const label of JEWELLERY_STYLE_OPTIONS) {
    const key = label.toLowerCase();
    if (key.includes(lower) || lower.includes(key) || key.includes(simplified) || simplified.includes(key)) {
      return label;
    }
  }
  return value.replace(/\s+/g, " ").trim().replace(/\b\w/g, (ch) => ch.toUpperCase());
}
