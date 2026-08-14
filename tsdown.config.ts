/**
 * 浏览器端 bundle 构建配置(lib/client.js)。
 *
 * 宿主端产物(lib/index.js)由 tsc(tsconfig.build.json)生成:tsc 会把
 * 标准 stage-3 装饰器(@Remote)编译成 __esDecorate 辅助调用,并保留
 * 方法参数名 —— Gateway SRC 模式靠 Function.prototype.toString 读取参数
 * 名作为 wire 字段名,rolldown 不改写参数名。
 *
 * 浏览器 bundle 是闭包工厂形态:外层调用 window.__ModuleLoader__.load
 * ({id, factory}),factory 是 CJS 形态;平台模块(react 等)保持
 * external,由加载器的模块表 require 提供;zod 等其余依赖全部内联。
 */

import { defineConfig } from 'tsdown'

/** 浏览器加载器模块表里的平台模块(shell 种子条目)。 */
const PLATFORM_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

export default defineConfig({
  name: 'dsh-context-inspector/client',
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: false,
  clean: false,
  minify: false,
  external: [...PLATFORM_EXTERNALS],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-context-inspector", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
