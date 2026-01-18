// ==UserScript==
// @name         Gemini Multi-Tab Ask with Snippets
// @namespace    https://example.com/
// @version      0.1.0
// @description  Add a button in Gemini web to open multiple tabs and auto-ask with user-provided strings.
// @match        https://gemini.google.com/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const APP_URL = "https://gemini.google.com/app";
  const DRAFT_KEY = "TM_GEMINI_MULTIASK_DRAFT";

  // ----------------------------
  // UI: floating button + modal
  // ----------------------------
  function injectThemeCSS() {
    if (document.getElementById("tm-gemini-multiask-theme")) return;

    const css = `
:root{
  --tm-bg: #ffffff;
  --tm-fg: #111827;
  --tm-muted: #6b7280;
  --tm-border: rgba(0,0,0,.14);
  --tm-card: rgba(255,255,255,.92);
  --tm-overlay: rgba(0,0,0,.42);
  --tm-btn-bg: #ffffff;
  --tm-btn-fg: #111827;
  --tm-btn-border: rgba(0,0,0,.18);
  --tm-primary: #1a73e8;
  --tm-primary-fg: #ffffff;
  --tm-danger: #ef4444;
  --tm-input-bg: #ffffff;
  --tm-shadow: 0 20px 60px rgba(0,0,0,.25);
}

@media (prefers-color-scheme: dark){
  :root{
    --tm-bg: #0b1220;
    --tm-fg: #e5e7eb;
    --tm-muted: #9ca3af;
    --tm-border: rgba(255,255,255,.14);
    --tm-card: rgba(17,24,39,.88);
    --tm-overlay: rgba(0,0,0,.60);
    --tm-btn-bg: rgba(17,24,39,.90);
    --tm-btn-fg: #e5e7eb;
    --tm-btn-border: rgba(255,255,255,.16);
    --tm-primary: #60a5fa;
    --tm-primary-fg: #081018;
    --tm-danger: #f87171;
    --tm-input-bg: rgba(3,7,18,.55);
    --tm-shadow: 0 24px 80px rgba(0,0,0,.55);
  }
}

/* Floating button */
#tm-gemini-multiask-btn{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 999999;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--tm-btn-border);
  background: var(--tm-btn-bg);
  color: var(--tm-btn-fg);
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(0,0,0,.18);
  font-size: 14px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
#tm-gemini-multiask-btn:hover{
  transform: translateY(-1px);
}

/* Overlay + modal */
#tm-gemini-multiask-overlay{
  position: fixed;
  inset: 0;
  background: var(--tm-overlay);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
#tm-gemini-multiask-modal{
  width: min(900px, 96vw);
  max-height: 90vh;
  overflow: auto;
  background: var(--tm-card);
  color: var(--tm-fg);
  border: 1px solid var(--tm-border);
  border-radius: 12px;
  box-shadow: var(--tm-shadow);
  padding: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.tm-title{ font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.tm-hint{ font-size: 12px; color: var(--tm-muted); margin-bottom: 10px; line-height: 1.45; }
.tm-label{ font-size: 13px; margin-bottom: 6px; color: var(--tm-fg); }

.tm-textarea{
  width: 100%;
  min-height: 70px;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid var(--tm-border);
  padding: 10px;
  font-size: 13px;
  box-sizing: border-box;
  background: var(--tm-input-bg);
  color: var(--tm-fg);
  outline: none;
}
.tm-textarea:focus{
  border-color: color-mix(in srgb, var(--tm-primary), transparent 40%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tm-primary), transparent 75%);
}

.tm-row{
  border: 1px solid var(--tm-border);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--tm-card), transparent 20%);
}
.tm-row-top{
  display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;
}

.tm-btn{
  border-radius: 10px;
  border: 1px solid var(--tm-border);
  background: color-mix(in srgb, var(--tm-btn-bg), transparent 0%);
  color: var(--tm-btn-fg);
  padding: 8px 12px;
  cursor: pointer;
}
.tm-btn:hover{ filter: brightness(1.05); }
.tm-btn-primary{
  border-color: color-mix(in srgb, var(--tm-primary), transparent 20%);
  background: var(--tm-primary);
  color: var(--tm-primary-fg);
}
.tm-btn-danger{
  border-color: color-mix(in srgb, var(--tm-danger), transparent 25%);
  background: color-mix(in srgb, var(--tm-danger), transparent 85%);
  color: var(--tm-fg);
  padding: 6px 10px;
  font-size: 12px;
}

.tm-header{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.tm-footer{
  display:flex; gap:10px; justify-content:flex-end; margin-top:14px;
}
  `;
    const style = document.createElement("style");
    style.id = "tm-gemini-multiask-theme";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createFloatingButton() {
    injectThemeCSS();
    const btn = document.createElement("button");
    btn.id = "tm-gemini-multiask-btn";
    btn.textContent = "MultiAsk";
    return btn;
  }

  function createModal() {
    injectThemeCSS();

    const overlay = document.createElement("div");
    overlay.id = "tm-gemini-multiask-overlay";

    const modal = document.createElement("div");
    modal.id = "tm-gemini-multiask-modal";

    const title = document.createElement("div");
    title.className = "tm-title";
    title.textContent = "MultiAsk：新增多个字符串并批量打开新 Tab 自动提问";

    const hint = document.createElement("div");
    hint.className = "tm-hint";
    hint.textContent =
      "将使用你当前输入框里的“未发送问题”作为基础问题；每条字符串会在新 Tab 里追加发送。";

    const baseQRow = document.createElement("div");
    baseQRow.style.marginBottom = "10px";

    const baseQLabel = document.createElement("div");
    baseQLabel.className = "tm-label";
    baseQLabel.textContent = "基础问题（自动读取当前输入框，可手动修改）：";

    const baseQ = document.createElement("textarea");
    baseQ.id = "tm-gemini-baseq";
    baseQ.className = "tm-textarea";

    baseQRow.appendChild(baseQLabel);
    baseQRow.appendChild(baseQ);

    const listWrap = document.createElement("div");
    listWrap.style.marginTop = "10px";

    const listHeader = document.createElement("div");
    listHeader.className = "tm-header";

    const listTitle = document.createElement("div");
    listTitle.className = "tm-label";
    listTitle.style.fontWeight = "700";
    listTitle.textContent = "字符串列表（每条会打开一个新 Tab）：";

    const addBtn = document.createElement("button");
    addBtn.className = "tm-btn";
    addBtn.textContent = "+ 添加字符串";

    listHeader.appendChild(listTitle);
    listHeader.appendChild(addBtn);

    const itemsContainer = document.createElement("div");
    itemsContainer.id = "tm-gemini-items";
    Object.assign(itemsContainer.style, {
      marginTop: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });

    function saveCurrentDraft() {
      const draft = {
        baseQuestion: baseQ.value || "",
        items: collectItems(itemsContainer),
        timestamp: Date.now(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }

    function addItem(prefill = "") {
      const row = document.createElement("div");
      row.className = "tm-row";

      const top = document.createElement("div");
      top.className = "tm-row-top";

      const label = document.createElement("div");
      label.className = "tm-hint";
      label.style.marginBottom = "0";
      label.textContent = "字符串";

      const del = document.createElement("button");
      del.className = "tm-btn-danger";
      del.textContent = "删除";

      const ta = document.createElement("textarea");
      ta.value = prefill;
      ta.className = "tm-textarea";
      ta.style.minHeight = "90px";

      del.addEventListener("click", () => row.remove());

      row.appendChild(top);
      row.appendChild(ta);

      // Auto-save listeners
      ta.addEventListener("input", saveCurrentDraft);
      del.addEventListener("click", () => {
        // Wait for row removal
        setTimeout(saveCurrentDraft, 0);
      });

      itemsContainer.appendChild(row);
    }

    addBtn.addEventListener("click", () => {
      addItem("");
      saveCurrentDraft();
    });

    baseQ.addEventListener("input", saveCurrentDraft);

    const footer = document.createElement("div");
    footer.className = "tm-footer";

    const cancel = document.createElement("button");
    cancel.className = "tm-btn";
    cancel.textContent = "取消";

    const start = document.createElement("button");
    start.className = "tm-btn tm-btn-primary";
    start.textContent = "开始：打开新 Tab 并自动提问";

    cancel.addEventListener("click", () => overlay.remove());


    footer.appendChild(cancel);
    footer.appendChild(start);

    modal.appendChild(title);
    modal.appendChild(hint);
    modal.appendChild(baseQRow);
    modal.appendChild(listWrap);
    listWrap.appendChild(listHeader);
    listWrap.appendChild(itemsContainer);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    // If no initial items (e.g. not loading from draft), add one empty
    // We defer this check to the caller (init) or handle it there.
    // Return exposed methods
    return { overlay, baseQ, itemsContainer, start, addItem, saveCurrentDraft };
  }

  // ----------------------------
  // Utilities
  // ----------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  function safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function getJobKey(jobId) {
    return `TM_GEMINI_MULTIASK_JOB_${jobId}`;
  }

  function getParam(name) {
    const url = new URL(location.href);
    return url.searchParams.get(name);
  }

  // Try to find Gemini prompt editor
  function findPromptEditor() {
    // Gemini occasionally uses contenteditable; try multiple selectors.
    const selectors = [
      'div[contenteditable="true"]',
      "textarea",
      "rich-textarea textarea",
      'div.ql-editor[contenteditable="true"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getEditorValue(editor) {
    if (!editor) return "";
    if (editor.tagName === "TEXTAREA") return editor.value || "";
    // contenteditable
    return (editor.innerText || "").trimEnd();
  }

  function setEditorValue(editor, text) {
    if (!editor) return false;

    if (editor.tagName === "TEXTAREA") {
      editor.focus();
      editor.value = text;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    // contenteditable
    editor.focus();
    // Try execCommand first (still works in many browsers)
    try {
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
    } catch {
      editor.innerText = text;
    }
    editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    return true;
  }

  async function clickSendButton() {
    const selectors = [
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="提交"]',
      'button[type="submit"]',
    ];

    for (let i = 0; i < 60; i++) {
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.disabled) {
          btn.click();
          return true;
        }
      }
      await sleep(250);
    }
    return false;
  }

  async function waitForEditor(timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ed = findPromptEditor();
      if (ed) return ed;
      await sleep(250);
    }
    return null;
  }

  // ----------------------------
  // Job runner (new tabs)
  // ----------------------------
  async function runJobIfPresent() {
    const jobId = getParam("tmjob");
    const idxStr = getParam("idx");
    if (!jobId || idxStr == null) return;

    const idx = Number(idxStr);
    const key = getJobKey(jobId);
    const job = safeJsonParse(localStorage.getItem(key), null);

    if (!job || !job.items || !job.items[idx]) return;

    // Wait Gemini UI ready
    const editor = await waitForEditor(45000);
    if (!editor) return;

    const baseQuestion = (job.baseQuestion || "").trim();
    const snippet = (job.items[idx] || "").trim();

    const finalPrompt = [baseQuestion, snippet].filter(Boolean).join("\n\n");

    setEditorValue(editor, finalPrompt);

    // Give UI a moment to enable send button
    await sleep(400);
    await clickSendButton();
  }

  function collectItems(itemsContainer) {
    const rows = Array.from(itemsContainer.querySelectorAll("textarea"));
    return rows.map((t) => (t.value || "").trim()).filter((v) => v.length > 0);
  }

  function openTabsWithJob(baseQuestion, items) {
    const jobId = uid();
    const key = getJobKey(jobId);

    localStorage.setItem(
      key,
      JSON.stringify({
        createdAt: Date.now(),
        baseQuestion,
        items,
      })
    );

    // Open N tabs
    items.forEach((_, i) => {
      const url = new URL(APP_URL);
      url.searchParams.set("tmjob", jobId);
      url.searchParams.set("idx", String(i));
      GM_openInTab(url.toString(), {
        active: i === 0,
        insert: true,
        setParent: true,
      });
    });
  }

  function loadDraft() {
    return safeJsonParse(localStorage.getItem(DRAFT_KEY), null);
  }

  // ----------------------------
  // Main: button wiring
  // ----------------------------
  async function init() {
    // If this tab is opened as a worker tab, run job and exit UI injection.
    await runJobIfPresent();

    // Inject button (normal tabs)
    if (document.getElementById("tm-gemini-multiask-btn")) return;

    const btn = createFloatingButton();
    document.body.appendChild(btn);

    btn.addEventListener("click", async () => {
      const { overlay, baseQ, itemsContainer, start, addItem, saveCurrentDraft } =
        createModal();

      const draft = loadDraft();
      if (draft && (draft.baseQuestion || (draft.items && draft.items.length))) {
        // Restore from draft
        baseQ.value = draft.baseQuestion || "";
        if (draft.items && draft.items.length > 0) {
          draft.items.forEach((txt) => addItem(txt));
        } else {
          addItem("");
        }
      } else {
        // Fresh start
        const editor = findPromptEditor();
        baseQ.value = getEditorValue(editor);
        addItem("");
        // Save initial state so even just opening it creates a draft?
        // Maybe better to wait for input. But let's save immediately to be safe
        // if user just types in prompt and closes.
        saveCurrentDraft();
      }

      document.body.appendChild(overlay);

      start.addEventListener("click", () => {
        const baseQuestion = (baseQ.value || "").trim();
        const items = collectItems(itemsContainer);


        if (items.length === 0) {
          alert("请至少添加一条字符串（非空）。");
          return;
        }

        // Open tabs in the same user gesture
        openTabsWithJob(baseQuestion, items);

        // Clear draft on success
        localStorage.removeItem(DRAFT_KEY);

        overlay.remove();
      });
    });
  }

  init();
})();

