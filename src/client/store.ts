/**
 * 面板开关状态的小型 store:shell.overlay 的面板(root 作用域)与
 * conversation.session.header.utilities 的开关按钮(session 作用域)分属
 * 两个 slot,靠这个模块级 store 共享开/关状态。React 侧用
 * useSyncExternalStore 订阅。
 */

/** 面板状态。 */
export interface PanelState {
  /** 面板是否展开。 */
  readonly open: boolean
  /** 当前选中的文件名(编辑视图);undefined 为清单视图。 */
  readonly selected: string | undefined
}

/** 面板 store 的对外面。 */
export interface PanelStore {
  getSnapshot(): PanelState
  subscribe(fn: () => void): () => void
  toggle(): void
  close(): void
  select(name: string | undefined): void
}

/** 创建一个面板 store。 */
export function createPanelStore(): PanelStore {
  let state: PanelState = { open: false, selected: undefined }
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
      state = { open: false, selected: undefined }
      emit()
    },
    select(name: string | undefined): void {
      state = { ...state, selected: name }
      emit()
    },
  }
}
