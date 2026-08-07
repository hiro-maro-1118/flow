// Vite の glob インポート機能を用いて、同ディレクトリ内のすべての .json ファイルを自動スキャン
const jsonModules = import.meta.glob("./*.json", { eager: true });

// 各 JSON モジュールから default エクスポートされたデータを取り出し、配列化してエクスポート
export const sampleFlows = Object.values(jsonModules).map((mod) => mod.default);
