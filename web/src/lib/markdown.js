const ESCAPED = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ESCAPED[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

export function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const html = [];
  let inList = false;

  function flushList() {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      flushList();
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      const level = match[1].length;
      const content = match[2].trim();
      html.push(`<h${level}>${escapeHtml(content)}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushList();
      html.push(`<blockquote>${escapeHtml(line.replace(/^>\s+/, ""))}</blockquote>`);
      continue;
    }

    if (/^\[.*\]\(.*\)$/.test(line)) {
      flushList();
      const match = line.match(/^\[(.*)\]\((.*)\)$/);
      const text = match[1];
      const href = escapeAttribute(match[2]);
      html.push(`<p><a href="${href}">${escapeHtml(text)}</a></p>`);
      continue;
    }

    flushList();
    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();
  return html.join("");
}
