"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

const TEXT_STORAGE_KEY = "hankou-present-content-v1";
const IMAGE_SETTINGS_KEY = "hankou-present-image-settings-v1";
const IMAGE_DATABASE = "hankou-present-images";
const IMAGE_STORE = "images";

type EditorStatus = "ready" | "editing" | "saved" | "exported" | "error";
type ImageFit = "contain" | "cover";
type ImageSettings = { fit: ImageFit; zoom: number; x: number; y: number };
type StoredImage = { key: string; blob: Blob; name: string };

const DEFAULT_IMAGE_SETTINGS: ImageSettings = { fit: "contain", zoom: 100, x: 50, y: 50 };

function getEditableValues(root: HTMLElement) {
  const values: Record<string, string> = {};
  root.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
    const key = element.dataset.editKey;
    if (key) values[key] = element.innerText;
  });
  return values;
}

function openImageDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(IMAGE_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE)) {
        request.result.createObjectStore(IMAGE_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredImages() {
  const database = await openImageDatabase();
  return new Promise<StoredImage[]>((resolve, reject) => {
    const request = database.transaction(IMAGE_STORE, "readonly").objectStore(IMAGE_STORE).getAll();
    request.onsuccess = () => {
      resolve(request.result as StoredImage[]);
      database.close();
    };
    request.onerror = () => {
      reject(request.error);
      database.close();
    };
  });
}

async function storeImage(image: StoredImage) {
  const database = await openImageDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, "readwrite");
    transaction.objectStore(IMAGE_STORE).put(image);
    transaction.oncomplete = () => {
      resolve();
      database.close();
    };
    transaction.onerror = () => {
      reject(transaction.error);
      database.close();
    };
  });
}

async function deleteStoredImage(key: string) {
  const database = await openImageDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, "readwrite");
    transaction.objectStore(IMAGE_STORE).delete(key);
    transaction.oncomplete = () => {
      resolve();
      database.close();
    };
    transaction.onerror = () => {
      reject(transaction.error);
      database.close();
    };
  });
}

async function clearStoredImages() {
  const database = await openImageDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, "readwrite");
    transaction.objectStore(IMAGE_STORE).clear();
    transaction.oncomplete = () => {
      resolve();
      database.close();
    };
    transaction.onerror = () => {
      reject(transaction.error);
      database.close();
    };
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function makeAbsoluteAttributes(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[src], [href]").forEach((element) => {
    for (const attribute of ["src", "href"] as const) {
      const value = element.getAttribute(attribute);
      if (
        !value ||
        value.startsWith("data:") ||
        value.startsWith("mailto:") ||
        value.startsWith("#")
      ) {
        continue;
      }
      element.setAttribute(attribute, new URL(value, window.location.origin).href);
    }
  });
}

function getImageSettings(element: HTMLElement | null, settings: Record<string, ImageSettings>) {
  const key = element?.dataset.imageKey;
  return key && settings[key] ? settings[key] : DEFAULT_IMAGE_SETTINGS;
}

function findImageContainer(root: HTMLElement | null, key: string) {
  return Array.from(root?.querySelectorAll<HTMLElement>("[data-image-key]") || []).find(
    (element) => element.dataset.imageKey === key,
  );
}

function applyImageSettings(container: HTMLElement, settings: ImageSettings) {
  const image = container.querySelector<HTMLImageElement>(".editable-image-stage img");
  if (!image) return;
  image.classList.add("editor-adjusted-image");
  image.style.setProperty("--editor-image-fit", settings.fit);
  image.style.setProperty("--editor-image-scale", String(settings.zoom / 100));
  image.style.setProperty("--editor-image-x", `${settings.x}%`);
  image.style.setProperty("--editor-image-y", `${settings.y}%`);
}

function installImage(
  root: HTMLElement,
  key: string,
  blob: Blob,
  name: string,
  settings: Record<string, ImageSettings>,
  imageBlobs: Map<string, Blob>,
  objectUrls: Map<string, string>,
) {
  const container = findImageContainer(root, key);
  const stage = container?.querySelector<HTMLElement>(".editable-image-stage");
  if (!container || !stage) return;

  const previousUrl = objectUrls.get(key);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  imageBlobs.set(key, blob);

  let image = stage.querySelector<HTMLImageElement>("img");
  if (!image) {
    stage.replaceChildren();
    image = document.createElement("img");
    stage.appendChild(image);
  }
  image.src = url;
  image.alt = name.replace(/\.[^.]+$/, "") || "上传的项目图片";
  image.classList.add("editor-uploaded-image");
  applyImageSettings(container, getImageSettings(container, settings));
}

export default function HankouEditor({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageSettingsRef = useRef<Record<string, ImageSettings>>({});
  const imageBlobsRef = useRef<Map<string, Blob>>(new Map());
  const originalStagesRef = useRef<Map<string, string>>(new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const [status, setStatus] = useState<EditorStatus>("ready");
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  const [selectedImageSettings, setSelectedImageSettings] = useState<ImageSettings>(
    DEFAULT_IMAGE_SETTINGS,
  );
  const [isBusy, setIsBusy] = useState(false);

  function saveEditorState() {
    if (!rootRef.current) return;
    window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(getEditableValues(rootRef.current)));
    window.localStorage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsRef.current));
    setStatus("saved");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") !== "1" || !rootRef.current) return;

    const root = rootRef.current;
    root.classList.add("is-editing");
    if (toolbarRef.current) toolbarRef.current.hidden = false;

    const savedText = window.localStorage.getItem(TEXT_STORAGE_KEY);
    if (savedText) {
      try {
        const values = JSON.parse(savedText) as Record<string, string>;
        root.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
          const key = element.dataset.editKey;
          if (key && typeof values[key] === "string") element.textContent = values[key];
        });
      } catch {
        window.localStorage.removeItem(TEXT_STORAGE_KEY);
      }
    }

    const savedImageSettings = window.localStorage.getItem(IMAGE_SETTINGS_KEY);
    if (savedImageSettings) {
      try {
        imageSettingsRef.current = JSON.parse(savedImageSettings) as Record<string, ImageSettings>;
      } catch {
        window.localStorage.removeItem(IMAGE_SETTINGS_KEY);
      }
    }

    root.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
      element.setAttribute("contenteditable", "plaintext-only");
      element.setAttribute("spellcheck", "false");
    });

    root.querySelectorAll<HTMLElement>("[data-image-key]").forEach((container) => {
      const key = container.dataset.imageKey;
      const stage = container.querySelector<HTMLElement>(".editable-image-stage");
      if (!key || !stage) return;
      originalStagesRef.current.set(key, stage.innerHTML);
      const bounds = stage.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        stage.style.aspectRatio = `${bounds.width} / ${bounds.height}`;
      }
      container.setAttribute("role", "button");
      container.setAttribute("tabindex", "0");
      container.setAttribute("aria-label", "选择并调整图片");
      applyImageSettings(container, getImageSettings(container, imageSettingsRef.current));
    });

    const imageBlobs = imageBlobsRef.current;
    const objectUrls = objectUrlsRef.current;
    getStoredImages()
      .then((images) =>
        images.forEach((image) =>
          installImage(
            root,
            image.key,
            image.blob,
            image.name,
            imageSettingsRef.current,
            imageBlobs,
            objectUrls,
          ),
        ),
      )
      .catch(() => setStatus("error"));

    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(getEditableValues(root)));
        window.localStorage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsRef.current));
        setStatus("saved");
        return;
      }
      const target = event.target as HTMLElement;
      const imageContainer = target.closest<HTMLElement>("[data-image-key]");
      if (imageContainer && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        const key = imageContainer.dataset.imageKey;
        if (!key) return;
        root
          .querySelectorAll("[data-image-key].is-selected")
          .forEach((element) => element.classList.remove("is-selected"));
        imageContainer.classList.add("is-selected");
        setSelectedImageSettings(getImageSettings(imageContainer, imageSettingsRef.current));
        setSelectedImageKey(key);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("keydown", handleKeyboard);
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function selectImage(container: HTMLElement) {
    const key = container.dataset.imageKey;
    if (!key || !rootRef.current) return;
    rootRef.current
      .querySelectorAll("[data-image-key].is-selected")
      .forEach((element) => element.classList.remove("is-selected"));
    container.classList.add("is-selected");
    setSelectedImageSettings(getImageSettings(container, imageSettingsRef.current));
    setSelectedImageKey(key);
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!rootRef.current?.classList.contains("is-editing")) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-edit-key]")) {
      if (target.closest("a")) event.preventDefault();
      return;
    }
    const imageContainer = target.closest<HTMLElement>("[data-image-key]");
    if (imageContainer) {
      event.preventDefault();
      selectImage(imageContainer);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedImageKey) return;
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      event.target.value = "";
      return;
    }
    try {
      setIsBusy(true);
      await storeImage({ key: selectedImageKey, blob: file, name: file.name });
      if (rootRef.current) {
        installImage(
          rootRef.current,
          selectedImageKey,
          file,
          file.name,
          imageSettingsRef.current,
          imageBlobsRef.current,
          objectUrlsRef.current,
        );
      }
      saveEditorState();
    } catch {
      setStatus("error");
    } finally {
      setIsBusy(false);
    }
    event.target.value = "";
  }

  function updateImageSetting(setting: keyof ImageSettings, value: number | ImageFit) {
    if (!selectedImageKey) return;
    const current = imageSettingsRef.current[selectedImageKey] || { ...DEFAULT_IMAGE_SETTINGS };
    const next = { ...current, [setting]: value };
    imageSettingsRef.current[selectedImageKey] = next;
    const container = findImageContainer(rootRef.current, selectedImageKey);
    if (container) applyImageSettings(container, next);
    setStatus("editing");
  }

  function handleRangeInput(setting: "zoom" | "x" | "y", event: FormEvent<HTMLInputElement>) {
    updateImageSetting(setting, Number(event.currentTarget.value));
  }

  function toggleImageFit() {
    if (!selectedImageKey) return;
    const current = imageSettingsRef.current[selectedImageKey] || { ...DEFAULT_IMAGE_SETTINGS };
    const fit = current.fit === "contain" ? "cover" : "contain";
    updateImageSetting("fit", fit);
    setSelectedImageSettings({ ...current, fit });
  }

  async function restoreSelectedImage() {
    if (!selectedImageKey) return;
    const container = findImageContainer(rootRef.current, selectedImageKey);
    const stage = container?.querySelector<HTMLElement>(".editable-image-stage");
    const originalMarkup = originalStagesRef.current.get(selectedImageKey);
    if (!container || !stage || originalMarkup === undefined) return;
    try {
      setIsBusy(true);
      await deleteStoredImage(selectedImageKey);
      const objectUrl = objectUrlsRef.current.get(selectedImageKey);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrlsRef.current.delete(selectedImageKey);
      imageBlobsRef.current.delete(selectedImageKey);
      delete imageSettingsRef.current[selectedImageKey];
      stage.innerHTML = originalMarkup;
      applyImageSettings(container, DEFAULT_IMAGE_SETTINGS);
      setSelectedImageSettings(DEFAULT_IMAGE_SETTINGS);
      saveEditorState();
    } catch {
      setStatus("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function exportHtml() {
    if (!rootRef.current) return;
    const page = rootRef.current.querySelector<HTMLElement>("main.hankou-article");
    if (!page) return;
    try {
      setIsBusy(true);
      const clone = page.cloneNode(true) as HTMLElement;
      clone.querySelectorAll<HTMLElement>("[data-edit-key]").forEach((element) => {
        element.removeAttribute("contenteditable");
        element.removeAttribute("data-edit-key");
        element.removeAttribute("spellcheck");
      });
      clone.querySelectorAll<HTMLElement>("[data-image-key]").forEach((container) => {
        const key = container.dataset.imageKey;
        container.classList.remove("is-selected");
        container.removeAttribute("data-image-key");
        container.removeAttribute("role");
        container.removeAttribute("tabindex");
        container.removeAttribute("aria-label");
        if (!key) return;
        const blob = imageBlobsRef.current.get(key);
        const image = container.querySelector<HTMLImageElement>("img");
        if (blob && image) image.dataset.exportBlobKey = key;
      });
      for (const image of clone.querySelectorAll<HTMLImageElement>("img[data-export-blob-key]")) {
        const key = image.dataset.exportBlobKey;
        const blob = key ? imageBlobsRef.current.get(key) : undefined;
        if (blob) image.src = await blobToDataUrl(blob);
        image.removeAttribute("data-export-blob-key");
      }
      makeAbsoluteAttributes(clone);

      const stylesheets = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
        .map((link) => `<link rel="stylesheet" href="${new URL(link.href, window.location.origin).href}">`)
        .join("\n");
      const inlineStyles = Array.from(document.querySelectorAll<HTMLStyleElement>("style"))
        .map((style) => `<style>${style.textContent || ""}</style>`)
        .join("\n");
      const title = document.title || "Hankou Present";
      const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</title>
${stylesheets}
${inlineStyles}
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
    } catch {
      setStatus("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function resetChanges() {
    const confirmed = window.confirm("恢复为网站中的默认内容？保存的文字和上传图片都会被清除。");
    if (!confirmed) return;
    window.localStorage.removeItem(TEXT_STORAGE_KEY);
    window.localStorage.removeItem(IMAGE_SETTINGS_KEY);
    try {
      setIsBusy(true);
      await clearStoredImages();
      window.location.reload();
    } catch {
      setStatus("error");
      setIsBusy(false);
    }
  }

  function handleInput() {
    if (status !== "editing") setStatus("editing");
  }

  const statusText = {
    ready: "点击文字修改，点击图片选择",
    editing: "有未保存修改",
    saved: "已保存到此浏览器",
    exported: "HTML 已导出",
    error: "操作失败，请重试",
  }[status];

  return (
    <div
      className="hankou-editor"
      ref={rootRef}
      onClickCapture={handleClickCapture}
      onInput={handleInput}
    >
      {children}

      <input
        className="hankou-editor-file-input"
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        ref={fileInputRef}
        tabIndex={-1}
      />

      <aside
        className={`hankou-editor-toolbar${selectedImageKey ? " has-image-selection" : ""}`}
        aria-label="页面编辑工具"
        hidden
        ref={toolbarRef}
      >
        {selectedImageKey && (
          <div className="hankou-image-controls" aria-label="图片调整">
            <span className="hankou-image-name">已选择图片</span>
            <button
              className={isBusy ? "is-loading" : undefined}
              type="button"
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              {isBusy ? "处理中" : "上传或更换"}
            </button>
            <button
              className="is-secondary"
              type="button"
              disabled={isBusy}
              onClick={toggleImageFit}
            >
              {selectedImageSettings.fit === "contain" ? "完整显示" : "填满裁切"}
            </button>
            <label>
              <span>缩放</span>
              <input
                key={`${selectedImageKey}-zoom`}
                type="range"
                min="100"
                max="200"
                defaultValue={selectedImageSettings.zoom}
                disabled={isBusy}
                onInput={(event) => handleRangeInput("zoom", event)}
              />
            </label>
            <label>
              <span>水平</span>
              <input
                key={`${selectedImageKey}-x`}
                type="range"
                min="0"
                max="100"
                defaultValue={selectedImageSettings.x}
                disabled={isBusy}
                onInput={(event) => handleRangeInput("x", event)}
              />
            </label>
            <label>
              <span>垂直</span>
              <input
                key={`${selectedImageKey}-y`}
                type="range"
                min="0"
                max="100"
                defaultValue={selectedImageSettings.y}
                disabled={isBusy}
                onInput={(event) => handleRangeInput("y", event)}
              />
            </label>
            <button
              className="is-secondary"
              type="button"
              disabled={isBusy}
              onClick={restoreSelectedImage}
            >
              恢复原图
            </button>
          </div>
        )}

        <div className="hankou-editor-mainbar">
          <div className="hankou-editor-status" aria-live="polite">
            <strong>编辑模式</strong>
            <span>{statusText}</span>
          </div>
          <div className="hankou-editor-actions">
            <button type="button" disabled={isBusy} onClick={saveEditorState}>
              保存
            </button>
            <button
              className={isBusy ? "is-loading" : undefined}
              type="button"
              disabled={isBusy}
              onClick={exportHtml}
            >
              {isBusy ? "处理中" : "导出 HTML"}
            </button>
            <button
              className="is-secondary"
              type="button"
              disabled={isBusy}
              onClick={resetChanges}
            >
              恢复默认
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
