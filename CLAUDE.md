# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PanelifyはMarkdownファイル（特にObsidianファイル）を美しいグリッドベースのダッシュボードに変換するElectronアプリです。

## アーキテクチャ構成

- **Main Process** (`src/main/`): Electronのメインプロセス。ファイル操作、設定管理（electron-store）、IPCハンドリングを担当
- **Renderer Process** (`src/renderer/`): React + TypeScriptのWebアプリ部分。ダッシュボードUI、グリッドレイアウト（react-grid-layout）を担当  
- **Preload Script** (`src/main/preload.ts`): セキュアなIPC通信のためのブリッジ
- **Types** (`src/types/`): TypeScript型定義

## 開発コマンド

```bash
# ビルド（TypeScript → JavaScript, Webpack）
npm run build

# アプリケーション起動
npm start

# 開発モード起動（DevTools付き）
npm run dev

# TypeScript監視モード
npm run watch
```

## 主要機能とファイル構成

### Markdown解析システム
- `markdownParser.ts`: H1/H2見出しベースでMarkdownをセクションに分割
- H1はプレフィックス、H2が実際のパネルになる仕組み
- 日本語タイトルに対応したID生成

### レイアウトシステム  
- `react-grid-layout`を使用した12グリッドシステム
- レイアウト設定はファイルパスごとに`electron-store`で永続化
- 編集モード/閲覧モードの切り替え可能

### ファイル管理
- デフォルトパス: `/Users/kyokomi/Obsidian/main`
- 最近開いたファイル履歴（最大5件）
- 最後に開いたファイルの自動読み込み
- ファイル再読み込み機能

### IPC通信パターン
Main Processで以下のハンドラーを実装:
- `select-markdown-file`: ファイル選択ダイアログ
- `read-markdown-file`: ファイル読み込み
- `save-layout-config`: レイアウト設定保存
- `load-layout-config`: レイアウト設定読み込み
- `get-last-opened-file`: 最後に開いたファイル取得
- `get-recent-files`: 最近のファイル一覧取得

## 開発時の注意点

- TypeScript strict モード有効
- Webpackで3つのエントリポイント（main, preload, renderer）をビルド
- CSS-in-JSではなく従来のCSSファイル使用
- marked.js でMarkdown → HTML変換
- セキュリティ: contextIsolation有効、nodeIntegration無効

## コーディング規約

### .editorconfig準拠（厳守）
- **文字エンコーディング**: UTF-8
- **改行コード**: LF
- **インデント**: スペース2文字（タブ禁止）
- **最大行長**: 120文字
- **ファイル末尾**: 必ず改行を挿入
- **末尾空白**: 削除必須

### 開発時チェック項目
- コミット前に.editorconfigルールに違反していないか確認
- エディタの設定で.editorconfigプラグインを有効化推奨
- 自動整形ツールの活用を推奨