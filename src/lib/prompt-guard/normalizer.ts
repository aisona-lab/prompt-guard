// prompt-guard normalizer — pre-processing pipeline for prompts

import { NormalizedPrompt } from "./models";

// Zero-width characters to strip
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF]/g;

// Homoglyph mapping: Unicode lookalikes → ASCII equivalents
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic → Latin
  "\u0430": "a", // а → a
  "\u0435": "e", // е → e
  "\u043E": "o", // о → o
  "\u0440": "p", // р → p
  "\u0441": "c", // с → c
  "\u0443": "y", // у → y
  "\u0445": "x", // х → x
  "\u0410": "A", // А → A
  "\u0412": "B", // В → B
  "\u0415": "E", // Е → E
  "\u041A": "K", // К → K
  "\u041C": "M", // М → M
  "\u041D": "H", // Н → H
  "\u041E": "O", // О → O
  "\u0420": "P", // Р → P
  "\u0421": "C", // С → C
  "\u0422": "T", // Т → T
  "\u0425": "X", // Х → X
  // Greek
  "\u03B1": "a", // α → a
  "\u03B5": "e", // ε → e
  "\u03BF": "o", // ο → o
  "\u03C1": "p", // ρ → p
  "\u03C5": "v", // υ → v
  // Fullwidth Latin
  "\uFF41": "a", // ａ → a
  "\uFF42": "b", // ｂ → b
  "\uFF43": "c", // ｃ → c
  "\uFF44": "d", // ｄ → d
  "\uFF45": "e", // ｅ → e
  "\uFF46": "f", // ｆ → f
  "\uFF47": "g", // ｇ → g
  "\uFF48": "h", // ｈ → h
  "\uFF49": "i", // ｉ → i
  "\uFF4A": "j",
  "\uFF4B": "k",
  "\uFF4C": "l",
  "\uFF4D": "m",
  "\uFF4E": "n",
  "\uFF4F": "o",
  "\uFF50": "p",
  "\uFF51": "q",
  "\uFF52": "r",
  "\uFF53": "s",
  "\uFF54": "t",
  "\uFF55": "u",
  "\uFF56": "v",
  "\uFF57": "w",
  "\uFF58": "x",
  "\uFF59": "y",
  "\uFF5A": "z",
  // Math symbols
  "\u212D": "C", // ℭ → C
  "\u2102": "C", // ℂ → C
  "\u2148": "I", // ⅈ → I
  "\u2149": "J", // ⅉ → J
};

// Base64 pattern
const BASE64_PATTERN = /[A-Za-z0-9+/]{20,}={0,2}/g;

// Hex escape pattern: \x69\x67\x6e\x6f\x72\x65
const HEX_ESCAPE_PATTERN = /\\x([0-9a-fA-F]{2})/g;

// Unicode escape pattern: \u0069
const UNICODE_ESCAPE_PATTERN = /\\u([0-9a-fA-F]{4})/g;

// ROT13 alphabet
const ROT13_LOWER = "nopqrstuvwxyzabcdefghijklm";
const ROT13_UPPER = "NOPQRSTUVWXYZABCDEFGHIJKLM";

function rot13Decode(str: string): string {
  return str.replace(/[a-zA-Z]/g, (char) => {
    const isLower = char === char.toLowerCase();
    const alphabet = isLower ? ROT13_LOWER : ROT13_UPPER;
    const index = isLower
      ? char.charCodeAt(0) - "a".charCodeAt(0)
      : char.charCodeAt(0) - "A".charCodeAt(0);
    return alphabet[index];
  });
}

function isPrintableAscii(str: string): boolean {
  const printable = str.replace(/\s/g, "");
  if (printable.length < 4) return false;
  const asciiCount = printable
    .split("")
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 126).length;
  return asciiCount / printable.length > 0.8;
}

// Leetspeak mapping
const LEETSPEAK_MAP: Record<string, string> = {
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "0": "o",
  "@": "a",
  "$": "s",
  "!": "i",
  "+": "t",
};

function normalizeLeetspeak(str: string): string {
  return str.replace(/[134570@$!+]/g, (char) => LEETSPEAK_MAP[char] || char);
}

export function normalize(original: string): NormalizedPrompt {
  let normalized = original;
  const decodedSegments: string[] = [];
  const transformationsApplied: string[] = [];

  // 1. Decode unicode escapes: \u0069gnore → ignore
  //    Decode unconditionally and detect change, rather than calling `.test()`
  //    on a /g regex (which is stateful across calls and can miss matches).
  const afterUnicode = normalized.replace(
    UNICODE_ESCAPE_PATTERN,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  if (afterUnicode !== normalized) {
    normalized = afterUnicode;
    transformationsApplied.push("unicode-escape-decode");
  }

  // 2. Decode hex escapes: \x69 → i
  const afterHex = normalized.replace(
    HEX_ESCAPE_PATTERN,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  if (afterHex !== normalized) {
    normalized = afterHex;
    transformationsApplied.push("hex-escape-decode");
  }

  // 3. Decode base64 strings
  const base64Matches = original.match(BASE64_PATTERN);
  if (base64Matches) {
    for (const match of base64Matches) {
      try {
        const decoded = atob(match);
        if (isPrintableAscii(decoded)) {
          decodedSegments.push(decoded);
          if (!transformationsApplied.includes("base64-decode")) {
            transformationsApplied.push("base64-decode");
          }
        }
      } catch {
        // Not valid base64, skip
      }
    }
  }

  // 4. Strip zero-width characters
  if (ZERO_WIDTH_CHARS.test(normalized)) {
    normalized = normalized.replace(ZERO_WIDTH_CHARS, "");
    transformationsApplied.push("strip-zero-width");
  }

  // 5. Normalize homoglyphs
  let homoglyphCount = 0;
  const homoglyphNormalized = normalized.replace(
    /./g,
    (char) => {
      if (HOMOGLYPH_MAP[char]) {
        homoglyphCount++;
        return HOMOGLYPH_MAP[char];
      }
      return char;
    }
  );
  if (homoglyphCount > 0) {
    normalized = homoglyphNormalized;
    transformationsApplied.push("homoglyph-normalization");
  }

  // 6. ROT13 detection — try to decode and check for malicious patterns
  const rot13Decoded = rot13Decode(normalized);
  const rot13Keywords = [
    "ignore",
    "instruction",
    "system",
    "jailbreak",
    "bypass",
    "override",
    "forget",
  ];
  const hasRot13Keywords = rot13Keywords.some((kw) =>
    rot13Decoded.toLowerCase().includes(kw)
  );
  if (hasRot13Keywords && rot13Decoded !== normalized) {
    decodedSegments.push(rot13Decoded);
    transformationsApplied.push("rot13-decode");
  }

  // 7. Leetspeak normalization (for the lowercase version)
  // Only flag leetspeak if the normalized result contains suspicious keywords,
  // not just because the text contains numbers (e.g., SSN 123-45-6789)
  const lowerForLeet = normalized.toLowerCase();
  const leetNormalized = normalizeLeetspeak(lowerForLeet);
  const leetChanged = leetNormalized !== lowerForLeet;
  const leetKeywords = [
    "ignore", "instruction", "system", "jailbreak", "bypass", "override",
    "forget", "disregard", "dan", "hack", "admin", "root", "exec", "drop",
    "delete", "destroy", "exploit", "inject", "malware", "phish", "steal",
  ];
  // Only flag leetspeak when the substitution *reveals* a suspicious keyword
  // that wasn't already present in plain text. Otherwise benign prompts that
  // merely contain punctuation (e.g. "!" -> "i") and a common word like
  // "forget" would be flagged as obfuscation.
  const revealsHiddenKeyword =
    leetChanged &&
    leetKeywords.some((kw) => leetNormalized.includes(kw) && !lowerForLeet.includes(kw));
  if (revealsHiddenKeyword) {
    decodedSegments.push(leetNormalized);
    transformationsApplied.push("leetspeak-normalization");
  }

  // 8. Lowercase for matching
  const finalNormalized = normalized.toLowerCase();

  return {
    original,
    normalized: finalNormalized,
    decoded_segments: decodedSegments,
    transformations_applied: transformationsApplied,
  };
}
