/**
 * 面板样式:一段以 <style data-plugin="dsh-project-files"> 注入的 CSS,
 * 类名统一 dpf- 前缀避免与其它插件冲突。
 * 颜色全部走官方全局 --dsw-alias-* 设计令牌,深浅色随宿主主题自动适配
 * (不自带 prefers-color-scheme 分支);字号/圆角/控件高度沿用官方设置页
 * 词汇(卡片 r12、输入 r8、密集胶囊 h28 r14)。
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
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  border-left: 1px solid var(--dsw-alias-border-l2);
  box-shadow: -8px 0 24px var(--dsw-alias-bg-mask-3);
  font-size: 13px;
  z-index: 60;
}
.dpf-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
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
  color: var(--dsw-alias-label-tertiary);
  direction: rtl;
  text-align: left;
}
.dpf-close {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 6px;
}
.dpf-close:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px 14px;
}
.dpf-hint {
  color: var(--dsw-alias-label-tertiary);
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
.dpf-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-row-name {
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
}
.dpf-row-missing .dpf-row-name { color: var(--dsw-alias-label-dimmed); }
.dpf-row-main {
  flex: 1;
  min-width: 0;
}
.dpf-row-purpose {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  margin-top: 2px;
}
.dpf-row-meta {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.dpf-row-actions {
  display: flex;
  gap: 4px;
}
.dpf-iconbtn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
}
.dpf-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-iconbtn:disabled { opacity: 0.4; cursor: default; }
.dpf-editor-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.dpf-editor-name {
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  flex: 1;
}
.dpf-editor-meta {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  margin-bottom: 8px;
}
.dpf-editor {
  width: 100%;
  min-height: 300px;
  flex: 1;
  resize: vertical;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  padding: 10px;
}
.dpf-editor:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.dpf-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}
.dpf-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
}
.dpf-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-btn:disabled { opacity: 0.4; cursor: default; }
.dpf-btn-primary {
  border: none;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.dpf-btn-primary:hover { background: var(--dsw-alias-button-primary-hover); }
.dpf-btn-danger { color: var(--dsw-alias-state-error-primary); }
.dpf-btn-danger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }
.dpf-status {
  font-size: 12px;
  margin-top: 8px;
  min-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.dpf-status-error { color: var(--dsw-alias-state-error-primary); }
.dpf-toggle {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  border-radius: 999px;
  padding: 3px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.6;
}
.dpf-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-toggle-active {
  background: var(--dsw-alias-interactive-bg-hover-accent);
  border-color: var(--dsw-alias-brand-primary);
}
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
