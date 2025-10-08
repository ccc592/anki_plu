/**
 * Clean up HTML from various sources (ChatGPT, etc.)
 * Remove unnecessary elements while preserving content and code highlighting
 * 
 * NEW VERSION: Minimal cleaning to preserve code block structure
 */

export function cleanHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  
  if (!container) {
    return html;
  }

  // 1. Remove unwanted UI elements (buttons, icons, etc.)
  const selectorsToRemove = [
    'button',           // All buttons
    'svg',              // Icons
    '[aria-label="复制"]',
    '[aria-label="复制代码"]',
    '[class*="copy"]',
    '[class*="Copy"]',
    '[class*="sticky"]',
    '[class*="toolbar"]',
    '.flex.items-center.justify-between', // ChatGPT toolbar
    '.flex.items-center.gap-4',           // Button groups
  ];

  selectorsToRemove.forEach(selector => {
    container.querySelectorAll(selector).forEach(el => el.remove());
  });

  // 2. Remove language labels (like "sql", "python", "javascript")
  // These are usually in divs before code blocks
  container.querySelectorAll('div, span').forEach(el => {
    const text = el.textContent?.trim() || '';
    
    // Check if it's a language label (short text, common languages)
    const languageLabels = [
      'javascript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
      'typescript', 'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'bash',
      'shell', 'powershell', 'json', 'xml', 'yaml', 'markdown', 'jsx', 'tsx'
    ];
    
    if (languageLabels.includes(text.toLowerCase()) && text.length < 15) {
      // Only remove if it's a standalone label, not part of larger text
      if (el.parentElement && el.textContent === text) {
        el.remove();
        return;
      }
    }
    
    // Remove "复制代码" or "Copy code" labels
    if (text === '复制代码' || text === 'Copy code' || text === '复制' || text === 'Copy') {
      el.remove();
      return;
    }
  });

  // 3. Remove empty divs/spans ONLY if they are not in code blocks and truly empty
  container.querySelectorAll('div, span').forEach(el => {
    // Skip if inside a code block (preserve all structure)
    if (el.closest('code') || el.closest('pre')) {
      return;
    }
    
    // Only remove if completely empty (no text, no children)
    if (!el.textContent && el.children.length === 0) {
      el.remove();
    }
  });

  // Remove data attributes (ChatGPT specific)
  container.querySelectorAll('[data-start], [data-end], [data-message-id]').forEach(el => {
    el.removeAttribute('data-start');
    el.removeAttribute('data-end');
    el.removeAttribute('data-message-id');
    el.removeAttribute('data-message-author-role');
    el.removeAttribute('data-message-model-slug');
    el.removeAttribute('data-testid');
    el.removeAttribute('data-state');
    el.removeAttribute('aria-label');
    el.removeAttribute('aria-pressed');
    el.removeAttribute('tabindex');
  });

  // Simplify class names (remove Tailwind/ChatGPT specific ones)
  container.querySelectorAll('[class]').forEach(el => {
    const classes = el.className.split(' ').filter(cls => {
      // Keep syntax highlighting classes
      if (cls.startsWith('hljs-') || cls.startsWith('language-')) {
        return true;
      }
      // Remove everything else
      return false;
    });
    
    if (classes.length > 0) {
      el.className = classes.join(' ');
    } else {
      el.removeAttribute('class');
    }
  });

  // Remove style attributes (inline styles)
  container.querySelectorAll('[style]').forEach(el => {
    el.removeAttribute('style');
  });

  return container.innerHTML;
}

/**
 * Add syntax highlighting CSS to Anki card
 * This should be injected into the card template
 */
export function getSyntaxHighlightCss(): string {
  return `
<style>
/* Code block styling - Light theme */
pre {
  background: #f6f8fa;
  color: #24292f;
  padding: 1em;
  border-radius: 0.5em;
  border: 1px solid #d0d7de;
  overflow-x: auto;
  margin: 1em 0;
}

code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

/* Inline code */
p code, li code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 0.3em;
  border: 1px solid #d0d7de;
  font-size: 0.85em;
}

/* Fix spacing between syntax highlight spans */
pre code span + span {
  margin-left: 0;
}

pre code span {
  white-space: pre;
}

/* Syntax highlighting colors (GitHub Light theme) */
.hljs-comment { color: #6a737d; font-style: italic; }
.hljs-keyword { color: #d73a49; font-weight: 600; }
.hljs-string { color: #032f62; }
.hljs-number { color: #005cc5; }
.hljs-built_in { color: #005cc5; }
.hljs-function { color: #6f42c1; }
.hljs-title { color: #6f42c1; font-weight: 600; }
.hljs-class { color: #6f42c1; }
.hljs-attr { color: #005cc5; }
.hljs-variable { color: #e36209; }
.hljs-type { color: #6f42c1; }
.hljs-tag { color: #22863a; }
.hljs-name { color: #22863a; }
.hljs-attribute { color: #6f42c1; }
.hljs-selector-id { color: #6f42c1; }
.hljs-selector-class { color: #6f42c1; }
.hljs-regexp { color: #032f62; }
.hljs-link { color: #005cc5; text-decoration: underline; }
.hljs-meta { color: #6a737d; }
.hljs-deletion { color: #b31d28; background: #ffeef0; }
.hljs-addition { color: #22863a; background: #f0fff4; }
</style>
`;
}
