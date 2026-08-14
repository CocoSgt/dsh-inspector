/**
 * 面板样式:一段以 <style data-plugin="dsh-project-files"> 注入的 CSS,
 * 类名统一 dpf- 前缀避免与其它插件冲突;深浅色各自适配 prefers-color-scheme。
 * dsh 的模块加载器会在插件卸载时移除 data-plugin 标记的样式标签。
 */

const CSS = `
.dpf-panel {
  pointer-events: auto;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(430px, 92vw);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #1f2328;
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  z-index: 60;
}
@media (prefers-color-scheme: dark) {
  .dpf-panel {
    background: #1b1d21;
    color: #e6e8eb;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.5);
  }
}
.dpf-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(127, 127, 127, 0.25);
}
.dpf-title {
  font-weight: 600;
  font-size: 14px;
}
.dpf-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.65;
  direction: rtl;
  text-align: left;
}
.dpf-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 6px;
}
.dpf-close:hover { background: rgba(127, 127, 127, 0.18); }
.dpf-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px 14px;
}
.dpf-hint {
  opacity: 0.7;
  padding: 18px 4px;
  line-height: 1.7;
}
.dpf-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 10px 10px;
  margin: 2px 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.dpf-row:hover { background: rgba(127, 127, 127, 0.12); }
.dpf-row-name {
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.dpf-row-missing .dpf-row-name { opacity: 0.45; }
.dpf-row-main {
  flex: 1;
  min-width: 0;
}
.dpf-row-purpose {
  opacity: 0.65;
  font-size: 12px;
  margin-top: 2px;
}
.dpf-row-meta {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
}
.dpf-row-actions {
  display: flex;
  gap: 4px;
}
.dpf-iconbtn {
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: transparent;
  color: inherit;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
}
.dpf-iconbtn:hover { background: rgba(127, 127, 127, 0.15); }
.dpf-iconbtn:disabled { opacity: 0.4; cursor: default; }
.dpf-editor-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dpf-editor-name {
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  flex: 1;
}
.dpf-editor-meta {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 8px;
}
.dpf-editor {
  width: 100%;
  min-height: 300px;
  flex: 1;
  resize: vertical;
  box-sizing: border-box;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.6;
  padding: 10px;
}
.dpf-editor:focus { outline: 2px solid rgba(90, 140, 220, 0.55); }
.dpf-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}
.dpf-btn {
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: rgba(127, 127, 127, 0.1);
  color: inherit;
  border-radius: 8px;
  padding: 5px 14px;
  cursor: pointer;
  font: inherit;
}
.dpf-btn:hover { background: rgba(127, 127, 127, 0.2); }
.dpf-btn:disabled { opacity: 0.45; cursor: default; }
.dpf-btn-primary {
  border-color: rgba(60, 110, 190, 0.7);
  background: rgba(60, 110, 190, 0.85);
  color: #ffffff;
}
.dpf-btn-primary:hover { background: rgba(60, 110, 190, 1); }
.dpf-btn-danger { border-color: rgba(190, 70, 60, 0.6); }
.dpf-btn-danger:hover { background: rgba(190, 70, 60, 0.15); }
.dpf-status {
  font-size: 12px;
  margin-top: 8px;
  min-height: 18px;
  opacity: 0.85;
}
.dpf-status-error { color: #d05a52; }
.dpf-toggle {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(127, 127, 127, 0.35);
  background: transparent;
  color: inherit;
  border-radius: 999px;
  padding: 3px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.6;
}
.dpf-toggle:hover { background: rgba(127, 127, 127, 0.14); }
.dpf-toggle-active { background: rgba(90, 140, 220, 0.2); border-color: rgba(90, 140, 220, 0.6); }
`

/** 幂等注入插件样式表(每次 materialization 至多一个标签)。 */
export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector('style[data-plugin="dsh-project-files"]') !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-project-files'
  tag.textContent = CSS
  document.head.appendChild(tag)
}
