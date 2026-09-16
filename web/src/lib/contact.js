// Contact address for the contribution banner.

/**
 * Split so the address is never a contiguous string in the built bundle.
 *
 * `.join()` specifically, and not `"a" + "@" + "b"`: esbuild — Vite's default
 * minifier — constant-folds adjacent string literals and template literals with
 * literal substitutions, so a concatenation would come back out of the bundle
 * as one piece. A join is not folded.
 *
 * This protects the deployed page, which is where address harvesters actually
 * look. It does nothing about the repository being public, so the address is a
 * dedicated one that can be thrown away if it ever starts attracting spam.
 */
const LOCAL_PART = ["gobelindle"];
const DOMAIN_PART = ["gmail", "com"];

export function buildContactAddress() {
  return [LOCAL_PART.join(""), DOMAIN_PART.join(".")].join("@");
}

const SUBJECT = "Goblindle — contribution";

const BODY = [
  "Bonjour !",
  "",
  "Ce que je veux signaler (gardez ce qui s'applique) :",
  "",
  "- Campagne manquante :",
  "- Anecdote à ajouter :",
  "- Information erronée :",
  "",
  "Merci !",
].join("\n");

/** `mailto:` URL with a prefilled subject and body. */
export function buildContactMailto() {
  const query = `subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
  return `mailto:${buildContactAddress()}?${query}`;
}
