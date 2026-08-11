import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // IndexedDB を使うテストのため、Node環境に fake-indexeddb を読み込ませる
    setupFiles: ['./src/test-setup.ts'],
  },
})
