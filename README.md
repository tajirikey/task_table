# ふたりの当番表

夫婦で「🍳 夕飯」「🏠 在宅当番」の担当と「🌙 夜不在の日」を共有する、カレンダー形式のWebアプリです。
お年玉管理アプリ（Otoshidama）と同じ方式（Next.js + Vercel KV + 共有パスワード）で動きます。

## 特徴

- **夫婦で共有**: サーバー（Vercel KV）で一元管理。複数端末から同じデータを閲覧・編集（5秒ごとに自動同期）
- **色 + アイコンで一目で分かる**: 担当者ごとの色と絵文字でカレンダーに表示（名前・色・アイコンは ⚙️ 設定で変更可）
  - 🍳 夕飯：夫 / 妻 / ふたり / なし
  - 🏠 在宅当番：夫 / 妻 / なし
  - 🌙 夜不在：2人それぞれ
- **今日のまとめ**: 画面上部に今日の担当を大きく表示
- **パスワードロック**: 環境変数で管理する共有パスワードでログイン（個人アカウントは不要）
- **PWA対応**: iPhoneのSafariで「ホーム画面に追加」するとアプリのように使えます

## 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Vercel KV (Upstash Redis)

## デプロイ方法（Vercel）

### 1. リポジトリを Vercel にインポート

1. [Vercel](https://vercel.com)で「New Project」からこのリポジトリをインポート
2. Framework Preset は `Next.js`、その他の設定はデフォルトでOK

### 2. Vercel KV を作成

1. プロジェクトの「Storage」タブを開く
2. 「Create Database」→「KV」（Upstash Redis）を選択
3. 作成後、プロジェクトに「Connect」する
4. これで `KV_REST_API_URL` / `KV_REST_API_TOKEN` などの環境変数が自動で注入されます

### 3. パスワードを環境変数に設定

プロジェクトの「Settings」→「Environment Variables」で以下を追加：

| Name | Value |
|------|-------|
| `APP_PASSWORD` | 共有したいパスワード文字列 |

すべての環境（Production / Preview / Development）にチェックを入れて保存。

### 4. デプロイ

設定後、再デプロイすれば反映されます。発行されたURLにアクセスし、`APP_PASSWORD` に設定したパスワードを入力すると使えます。

## ローカル開発

```bash
npm install
npm run dev
```

リポジトリ直下に `.env.local` を作成：

```
APP_PASSWORD=your-password
# 本物のサーバーストレージを使う場合のみ
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

`KV_REST_*` が未設定の場合は同一プロセス内のメモリにフォールバックします（再起動すると消えます）。

## しくみ

- ログイン成功時、サーバーはパスワードから作ったトークンを返し、ブラウザに保存します。データAPI（`/api/data`）はこのトークンがないと読み書きできません。
- 保存は「1日分」単位でサーバー側にマージするため、2人が同時に別の日を編集しても上書きし合いません。
- パスワードを変更すると、全端末で再ログインが必要になります。

## ライセンス

MIT
