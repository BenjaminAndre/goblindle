export async function copyTextToClipboard(text, overrides = {}) {
  const navigatorObj = overrides.navigatorObj ?? globalThis.navigator;
  const documentObj = overrides.documentObj ?? globalThis.document;
  const execCommand = overrides.execCommand ?? documentObj?.execCommand?.bind(documentObj);

  try {
    if (navigatorObj?.clipboard?.writeText) {
      await navigatorObj.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the manual copy helper when the clipboard API is blocked.
  }

  if (!documentObj) {
    throw new Error("Clipboard fallback requires a document object.");
  }

  const textarea = documentObj.createElement("textarea");
  textarea.value = text;
  documentObj.body.appendChild(textarea);
  textarea.select();

  try {
    const commandResult = execCommand ? execCommand("copy") : false;
    if (!commandResult) {
      throw new Error("execCommand copy failed");
    }
  } finally {
    documentObj.body.removeChild(textarea);
  }
}
