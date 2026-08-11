import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages はリポジトリ名のサブディレクトリで配信されるため、
// ここを変えるとURLもマニフェストのパスも一括で追従する。
const BASE = '/juggler-log/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 新しい版をデプロイしたら、次回起動時に黙って入れ替える。
      // ホールで更新ダイアログを出しても邪魔なだけなので確認はしない。
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon-32.png'],
      manifest: {
        name: 'ジャグラー実戦記録',
        short_name: 'ジャグ記録',
        description: 'ジャグラーの実戦データと収支を記録し、設定を推測するツール',
        lang: 'ja',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        // ホールは暗いので、起動画面から暗い配色にする
        background_color: '#0b0f19',
        theme_color: '#0b0f19',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 電波が弱いホールでも起動できるよう、アプリ本体は全てキャッシュする
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // 外部への通信は一切しないので、ナビゲーションは常にキャッシュから返す
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  server: {
    // スマホ実機で確認する場合は npm run dev:host で同一Wi-Fiから開く
    port: 5173,
  },
})
