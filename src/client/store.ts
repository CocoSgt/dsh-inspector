/**
 * 面板开关状态的小型 store:shell.overlay 的面板(root 作用域)与
 * conversation.session.header.utilities 的开关按钮(session 作用域)分属
 * 两个 slot,靠这个模块级 store 共享开/关状态。React 侧用
 * useSyncExternalStore 订阅。
 */

import type { FileAddress } from '../scoped-files.js'

/** 指引文件编辑目标;create 为真表示新建(保存才落盘)。 */
export interface FileEditTarget extends FileAddress {
  readonly kind?: 'file'
  readonly create: boolean
}

/** 技能文件编辑目标(约束文件面板的技能药丸点开)。 */
export interface SkillEditTarget {
  readonly kind: 'skill'
  /** 技能根的 displayPath(与 overview 一致)。 */
  readonly root: string
  /** SKILL.md 相对该根的路径。 */
  readonly path: string
  /** 技能名(标题展示)。 */
  readonly name: string
}

/** 编辑目标联合。 */
export type EditTarget = FileEditTarget | SkillEditTarget

/** 面板状态。 */
export interface PanelState {
  /** 面板是否展开。 */
  readonly open: boolean
  /** 当前编辑目标;undefined 为概览视图。 */
  readonly editing: EditTarget | undefined
}

/** 面板 store 的对外面。 */
export interface PanelStore {
  getSnapshot(): PanelState
  subscribe(fn: () => void): () => void
  toggle(): void
  close(): void
  edit(target: EditTarget | undefined): void
}

/** 创建一个面板 store。 */
export function createPanelStore(): PanelStore {
  let state: PanelState = { open: false, editing: undefined }
  const listeners = new Set<() => void>()
  const emit = (): void => {
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    toggle(): void {
      state = { ...state, open: !state.open }
      emit()
    },
    close(): void {
      state = { open: false, editing: undefined }
      emit()
    },
    edit(target: EditTarget | undefined): void {
      state = { ...state, editing: target }
      emit()
    },
  }
}
