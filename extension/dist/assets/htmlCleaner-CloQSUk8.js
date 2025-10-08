const n=r=>{let t=r.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"");return t=t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,""),t=t.replace(/<[^>]+>/g," "),t=t.replace(/&nbsp;/g," "),t=t.replace(/&amp;/g,"&"),t=t.replace(/&lt;/g,"<"),t=t.replace(/&gt;/g,">"),t=t.replace(/&quot;/g,'"'),t=t.replace(/&#39;/g,"'"),t},i=r=>r.replace(/\s+/g," ").trim(),d=r=>{const a=n(r).toLocaleLowerCase();return i(a).normalize("NFKC")},m=r=>Array.from(new Uint8Array(r)).map(t=>t.toString(16).padStart(2,"0")).join(""),h=async r=>{const a=new TextEncoder().encode(r),s=await crypto.subtle.digest("SHA-256",a);return m(s).slice(0,12)},u=async r=>{const t=d(r),a=await h(t);return{normalized:t,hash:a}};function f(r){const s=new DOMParser().parseFromString(`<div>${r}</div>`,"text/html").body.firstElementChild;return s?(["button","svg",'[aria-label="复制"]','[aria-label="复制代码"]','[class*="copy"]','[class*="Copy"]','[class*="sticky"]','[class*="toolbar"]',".flex.items-center.justify-between",".flex.items-center.gap-4"].forEach(e=>{s.querySelectorAll(e).forEach(o=>o.remove())}),s.querySelectorAll("div, span").forEach(e=>{var c;const o=((c=e.textContent)==null?void 0:c.trim())||"";if(["javascript","python","java","c++","c#","ruby","go","rust","typescript","php","swift","kotlin","sql","html","css","bash","shell","powershell","json","xml","yaml","markdown","jsx","tsx"].includes(o.toLowerCase())&&o.length<15&&e.parentElement&&e.textContent===o){e.remove();return}if(o==="复制代码"||o==="Copy code"||o==="复制"||o==="Copy"){e.remove();return}}),s.querySelectorAll("div, span").forEach(e=>{e.closest("code")||e.closest("pre")||!e.textContent&&e.children.length===0&&e.remove()}),s.querySelectorAll("[data-start], [data-end], [data-message-id]").forEach(e=>{e.removeAttribute("data-start"),e.removeAttribute("data-end"),e.removeAttribute("data-message-id"),e.removeAttribute("data-message-author-role"),e.removeAttribute("data-message-model-slug"),e.removeAttribute("data-testid"),e.removeAttribute("data-state"),e.removeAttribute("aria-label"),e.removeAttribute("aria-pressed"),e.removeAttribute("tabindex")}),s.querySelectorAll("[class]").forEach(e=>{const o=e.className.split(" ").filter(l=>!!(l.startsWith("hljs-")||l.startsWith("language-")));o.length>0?e.className=o.join(" "):e.removeAttribute("class")}),s.querySelectorAll("[style]").forEach(e=>{e.removeAttribute("style")}),s.innerHTML):r}function g(){return`
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
`}export{u as a,f as c,g};
//# sourceMappingURL=htmlCleaner-CloQSUk8.js.map
