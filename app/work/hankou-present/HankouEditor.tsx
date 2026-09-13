"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "hankou-present-content-v1";

type EditorStatus = "ready" | "editing" | "saved" | "exported";

function getEditableValues(root: HTMLElement) {
  const values: Record<string, string> = {};

  root.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
    const key = element.dataset.editKey;
    if (key) values[key] = element.innerText;
  });

  return values;
}

function makeAbsoluteAttributes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[src], [href]").forEach((element) => {
    for (const attribute of ["src", "href"] as const) {
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith("mailto:") || value.startsWith("#")) continue;
      element.setAttribute(attribute, new URL(value, window.location.origin).href);
    }
  });
}

export default function HankouEditor({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<EditorStatus>("ready");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") !== "1" || !rootRef.current) return;

    const root = rootRef.current;
    root.classList.add("is-editing");
    if (toolbarRef.current) toolbarRef.current.hidden = false;
    const editableElements = root.querySelectorAll<HTMLElement>("[data-edit-key]");
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const values = JSON.parse(saved) as Record<string, string>;
        editableElements.forEach((element) => {
          const key = element.dataset.editKey;
          if (key && typeof values[key] === "string") element.textContent = values[key];
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    editableElements.forEach((element) => {
      element.setAttribute("contenteditable", "plaintext-only");
      element.setAttribute("spellcheck", "false");
    });

    const handleKeyboardSave = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getEditableValues(root)));
        setStatus("saved");
      }
    };

    window.addEventListener("keydown", handleKeyboardSave);
    return () => window.removeEventListener("keydown", handleKeyboardSave);
  }, []);

  function saveChanges() {
    if (!rootRef.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getEditableValues(rootRef.current)));
    setStatus("saved");
  }

  function exportHtml() {
    if (!rootRef.current) return;

    const page = rootRef.current.querySelector<HTMLElement>("main.hankou-article");
    if (!page) return;

    const clone = page.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
      element.removeAttribute("contenteditable");
      element.removeAttribute("data-edit-key");
      element.removeAttribute("spellcheck");
    });
    makeAbsoluteAttributes(clone);

    const stylesheets = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    )
      .map((link) => `<link rel="stylesheet" href="${new URL(link.href, window.location.origin).href}">`)
      .join("\n");
    const title = document.title || "Hankou Present";
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</title>
${stylesheets}
</head>
<body>
${clone.outerHTML}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const download = document.createElement("a");
    download.href = url;
    download.download = "hankou-present-edited.html";
    document.body.appendChild(download);
    download.click();
    download.remove();
    URL.revokeObjectURL(url);
    setStatus("exported");
  }

  function resetChanges() {
    const confirmed = window.confirm("恢复为网站中的默认文案？当前浏览器里保存的修改会被清除。");
    if (!confirmed) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  function handleInput() {
    if (status !== "editing") setStatus("editing");
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!rootRef.current?.classList.contains("is-editing")) return;
    const target = event.target as HTMLElement;
    if (target.closest("a")?.querySelector("[data-edit-key]")?.contains(target)) {
      event.preventDefault();
    }
  }

  const statusText = {
    ready: "点击页面文字即可修改",
    editing: "有未保存修改",
    saved: "已保存到此浏览器",
    exported: "HTML 已导出",
  }[status];

  return (
    <div
      className="hankou-editor"
      ref={rootRef}
      onClickCapture={handleClickCapture}
      onInput={handleInput}
    >
      {children}

      <aside
        className="hankou-editor-toolbar"
        aria-label="页面编辑工具"
        hidden
        ref={toolbarRef}
      >
        <div className="hankou-editor-status" aria-live="polite">
          <strong>编辑模式</strong>
          <span>{statusText}</span>
        </div>
        <div className="hankou-editor-actions">
          <button type="button" onClick={saveChanges}>
            保存
          </button>
          <button type="button" onClick={exportHtml}>
            导出 HTML
          </button>
          <button className="is-secondary" type="button" onClick={resetChanges}>
            恢复默认
          </button>
        </div>
      </aside>
    </div>
  );
}
