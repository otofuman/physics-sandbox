# Physics Sandbox MVP

React、TypeScript、Tailwind CSS を使用して構築された、軽量でインタラクティブな2次元物理シミュレーション・サンドボックスのMVP（実用最小限の製品）です。

HTML5 Canvas を用いたリアルタイムな物理演算と、直感的なUIコントロールを組み合わせています。

---

## Web版
[ここ](https://physsandv0.vercel.app)からアクセス

## 🚀 主な機能

- **リアルタイム物理シミュレーション**
  - 重力、粒子（Particle）、ばね（Spring）、ダンパー（Damper）、剛体アーム（Rigid Arm）、境界（床の反発・摩擦）の演算
- **再生 / 停止コントロール**
  - シミュレーションのリアルタイムな一時停止と再開
- **リセット & パラメータ調整**
  - ワンクリックでの初期状態へのリセット機能
  - デフォルトのばね定数 ($k$) の動的な変更
- **エディタ / パレット機能**
  - 新規粒子の追加や、選択したオブジェクトのプロパティ（質量、半径、固定状態など）の変更に対応

---

## 🛠 使用技術

- **Frontend:** React (TypeScript)
- **Styling:** Tailwind CSS
- **Graphics:** HTML5 Canvas API
- **Build Tool:** Vite (推奨)

---

## 📦 インストール & 実行方法

ローカル環境で実行するには、Node.js がインストールされている必要があります。

1. **リポジトリのクローンまたはプロジェクトフォルダへ移動**
   ```bash
   cd physics-sandbox-mvp