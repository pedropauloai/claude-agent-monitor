/**
 * String similarity algorithms for the Correlation Engine.
 *
 * Pure TypeScript implementations with ZERO external dependencies.
 * All functions are exported for testing.
 *
 * Algorithms:
 * - Jaro-Winkler distance (string-level similarity)
 * - Token-based similarity (best token-to-token Jaro-Winkler)
 * - Combined similarity (weighted blend of full-string + token)
 */

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Decomposition map for common accented characters.
 *
 * Covers Portuguese (BR) diacritics and other Latin accents.
 * We avoid `String.prototype.normalize('NFD')` + regex because some
 * older runtimes handle combining marks inconsistently. An explicit map
 * is deterministic and fast for the characters we care about.
 */
const ACCENT_MAP: Record<string, string> = {
  '\u00E0': 'a', '\u00E1': 'a', '\u00E2': 'a', '\u00E3': 'a', '\u00E4': 'a', '\u00E5': 'a', // a-graves/accents
  '\u00E8': 'e', '\u00E9': 'e', '\u00EA': 'e', '\u00EB': 'e', // e-accents
  '\u00EC': 'i', '\u00ED': 'i', '\u00EE': 'i', '\u00EF': 'i', // i-accents
  '\u00F2': 'o', '\u00F3': 'o', '\u00F4': 'o', '\u00F5': 'o', '\u00F6': 'o', // o-accents
  '\u00F9': 'u', '\u00FA': 'u', '\u00FB': 'u', '\u00FC': 'u', // u-accents
  '\u00E7': 'c', // c-cedilla
  '\u00F1': 'n', // n-tilde
  '\u00FD': 'y', '\u00FF': 'y', // y-accents
  // Uppercase equivalents (after toLowerCase these shouldn't appear, but just in case)
  '\u00C0': 'a', '\u00C1': 'a', '\u00C2': 'a', '\u00C3': 'a', '\u00C4': 'a', '\u00C5': 'a',
  '\u00C8': 'e', '\u00C9': 'e', '\u00CA': 'e', '\u00CB': 'e',
  '\u00CC': 'i', '\u00CD': 'i', '\u00CE': 'i', '\u00CF': 'i',
  '\u00D2': 'o', '\u00D3': 'o', '\u00D4': 'o', '\u00D5': 'o', '\u00D6': 'o',
  '\u00D9': 'u', '\u00DA': 'u', '\u00DB': 'u', '\u00DC': 'u',
  '\u00C7': 'c',
  '\u00D1': 'n',
  '\u00DD': 'y',
};

/**
 * Normalise a string for comparison:
 *  - lowercase
 *  - replace accented characters with ASCII equivalents
 *  - trim leading/trailing whitespace
 *  - collapse multiple whitespace into a single space
 */
export function normalizeString(s: string): string {
  let result = s.toLowerCase();

  // Replace accented chars via map (fast path for common Latin chars)
  let normalized = '';
  for (let i = 0; i < result.length; i++) {
    const ch = result[i]!;
    const replacement = ACCENT_MAP[ch];
    normalized += replacement !== undefined ? replacement : ch;
  }
  result = normalized;

  // Collapse whitespace and trim
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Tokenize a string into words.
 *
 * Splits on whitespace, underscores, hyphens, dots, slashes, colons, and
 * other common separators.
 *
 * IMPORTANT: NO minimum length filter. Short tokens like "UI", "API", "DB",
 * "SSE", "CI" are critical for matching technical task titles.
 */
export function tokenize(s: string): string[] {
  const normalized = normalizeString(s);
  if (normalized.length === 0) return [];

  return normalized
    .split(/[\s_\-/\\.:,;|()[\]{}]+/)
    .filter(token => token.length > 0);
}

// ---------------------------------------------------------------------------
// Jaro-Winkler similarity
// ---------------------------------------------------------------------------

/**
 * Compute the Jaro similarity between two strings.
 *
 * The Jaro similarity is defined as:
 *   jaro = (1/3) * (m/|s1| + m/|s2| + (m - t)/m)
 *
 * where:
 *   m = number of matching characters
 *   t = number of transpositions / 2
 *   Characters are considered matching if they are the same and within
 *   floor(max(|s1|, |s2|) / 2) - 1 positions of each other.
 *
 * Returns a value between 0 (no similarity) and 1 (identical).
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1.length === 0 && s2.length === 0) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  // The match window: characters must be within this distance
  const matchWindow = Math.max(Math.floor(maxLen / 2) - 1, 0);

  const s1Matches = new Array<boolean>(s1.length).fill(false);
  const s2Matches = new Array<boolean>(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3;

  return jaro;
}

/**
 * Compute the Jaro-Winkler similarity between two strings.
 *
 * Jaro-Winkler adds a prefix bonus to the base Jaro score. Strings that
 * share a common prefix of up to 4 characters receive a boost, which is
 * especially useful for matching task titles that start with the same verb
 * (e.g. "Implement auth" vs "Implement authentication").
 *
 * The formula is:
 *   jaroWinkler = jaro + (prefixLen * scalingFactor * (1 - jaro))
 *
 * where scalingFactor = 0.1 (standard Winkler constant) and
 * prefixLen is capped at 4.
 *
 * @returns A value between 0 (no similarity) and 1 (identical).
 */
export function jaroWinkler(a: string, b: string): number {
  const s1 = normalizeString(a);
  const s2 = normalizeString(b);

  const jaro = jaroSimilarity(s1, s2);

  // Calculate common prefix length (up to 4 characters)
  const maxPrefix = Math.min(4, s1.length, s2.length);
  let prefixLen = 0;
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLen++;
    } else {
      break;
    }
  }

  // Winkler modification: boost score for common prefix
  const scalingFactor = 0.1;
  const jaroWinklerScore = jaro + prefixLen * scalingFactor * (1 - jaro);

  return Math.min(jaroWinklerScore, 1.0);
}

// ---------------------------------------------------------------------------
// Token-based similarity
// ---------------------------------------------------------------------------

/**
 * Compute the best token-to-token similarity between two strings.
 *
 * Strategy:
 * 1. Tokenize both strings.
 * 2. For each token in `a`, find the best Jaro-Winkler match in `b`.
 * 3. Compute coverage-weighted score: tokens from the SHORTER set drive
 *    the score (so "auth module" vs "Implement auth module for the app"
 *    scores high because both "auth" and "module" match well).
 *
 * This handles:
 * - Word reordering: "auth module" vs "module auth" scores ~1.0
 * - Partial overlap: "auth module" vs "auth module implementation" scores high
 * - Morphological variants: "implement" vs "implementation" via Jaro-Winkler
 *
 * @returns A value between 0 (no token overlap) and 1 (perfect match).
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  // Use the shorter token set as the "query" to maximize coverage
  const [query, corpus] =
    tokensA.length <= tokensB.length
      ? [tokensA, tokensB]
      : [tokensB, tokensA];

  let totalScore = 0;

  for (const qToken of query) {
    let bestTokenScore = 0;

    for (const cToken of corpus) {
      // Use raw jaroSimilarity on already-normalized tokens (tokenize calls normalizeString)
      const score = jaroSimilarity(qToken, cToken);
      if (score > bestTokenScore) {
        bestTokenScore = score;
      }
      // Early exit if we found a perfect match
      if (bestTokenScore >= 1.0) break;
    }

    totalScore += bestTokenScore;
  }

  // Coverage factor: penalize if the corpus is much larger than the query.
  // A query of 2 tokens matching 2 out of 10 corpus tokens should score
  // lower than matching 2 out of 3.
  const rawScore = totalScore / query.length;
  const coverageRatio = query.length / corpus.length;

  // Blend: 80% raw match quality + 20% coverage
  // This ensures "auth" vs "implement auth module for the app" (1/5 coverage)
  // scores lower than "auth module" vs "auth module impl" (2/3 coverage)
  return rawScore * (0.8 + 0.2 * coverageRatio);
}

// ---------------------------------------------------------------------------
// Combined similarity
// ---------------------------------------------------------------------------

/**
 * Compute the combined similarity score between two strings.
 *
 * Blends full-string Jaro-Winkler with token-based similarity:
 *   combined = 0.6 * jaroWinkler(a, b) + 0.4 * tokenSimilarity(a, b)
 *
 * The full-string component captures overall character-level similarity
 * (good for typos, accents, minor variations). The token component
 * captures semantic overlap at the word level (good for reordering,
 * extra words, abbreviations).
 *
 * @returns A value between 0 and 1.
 */
export function combinedSimilarity(a: string, b: string): number {
  const fullStringScore = jaroWinkler(a, b);
  const tokenScore = tokenSimilarity(a, b);

  return 0.6 * fullStringScore + 0.4 * tokenScore;
}
