/**
 * 面板样式:一段以 <style data-plugin="dsh-context-inspector"> 注入的 CSS,
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
  width: min(440px, 92vw);
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
  white-space: nowrap;
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
.dpf-caption {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.6;
  margin: 4px 2px 8px;
}
.dpf-footnote {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.6;
  margin: 10px 2px 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--dsw-alias-border-l2);
}
.dpf-section-title {
  margin: 16px 2px 4px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-secondary);
}
.dpf-layer {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  padding: 8px 10px;
  margin: 8px 0;
}
.dpf-layer-head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 2px 6px;
}
.dpf-layer-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 12.5px;
}
.dpf-tag {
  flex: none;
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dpf-newbtn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  white-space: nowrap;
}
.dpf-newbtn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-layer-empty {
  color: var(--dsw-alias-label-dimmed);
  font-size: 12px;
  padding: 4px 2px 6px;
}
.dpf-choose {
  border-top: 1px dashed var(--dsw-alias-border-l2);
  margin-top: 4px;
  padding-top: 4px;
}
.dpf-choose-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.dpf-choose-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-choose-note {
  margin-left: auto;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.dpf-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 8px 8px;
  margin: 2px 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.dpf-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-dirrow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  margin: 2px 0;
}
.dpf-dirrow-btn {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.dpf-dirrow-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dpf-skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 10px 8px 22px;
}
.dpf-skill-pill-btn {
  cursor: pointer;
  background: transparent;
  font: inherit;
}
.dpf-skill-pill-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dpf-skill-pill {
  padding: 1px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 18px;
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  color: var(--dsw-alias-label-secondary);
}
.dpf-row-name {
  font-weight: 600;
  font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);
}
.dpf-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dpf-chip {
  flex: none;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 16px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dpf-chip-warn {
  background: transparent;
  border: 1px solid var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
}
.dpf-row-meta {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
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
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dpf-dirty {
  color: var(--dsw-alias-brand-primary);
  margin-left: 6px;
}
.dpf-guard {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-module-platform);
  font-size: 12px;
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
  flex-wrap: wrap;
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
  if (document.querySelector('style[data-plugin="dsh-context-inspector"]') !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-context-inspector'
  tag.textContent = CSS
  document.head.appendChild(tag)
}
