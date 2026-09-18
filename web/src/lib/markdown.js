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

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/\[(.+?)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
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
      const content = renderInlineMarkdown(match[2].trim());
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushList();
      html.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s+/, ""))}</blockquote>`);
      continue;
    }

    if (/^\[.*\]\(.*\)$/.test(line)) {
      flushList();
      const match = line.match(/^\[(.*)\]\((.*)\)$/);
      const text = renderInlineMarkdown(match[1]);
      const href = escapeHtml(match[2]);
      html.push(`<p><a href="${href}">${text}</a></p>`);
      continue;
    }

    flushList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  flushList();
  return html.join("");
}
