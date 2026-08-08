import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    configureServer(server) {
      // 編集したフローデータをサーバー側の実 JSON ファイルに書き戻すAPI
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api/save-flow') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const flowData = JSON.parse(body);
              const flowId = flowData.id;
              const flowVer = flowData.ver || "1.0";
              
              const dataDir = path.resolve(__dirname, 'src/data');
              const files = fs.readdirSync(dataDir);
              let targetFile = null;

              // 既存のファイルからIDとバージョンが一致するものを探す
              for (const file of files) {
                if (file.endsWith('.json')) {
                  const filePath = path.join(dataDir, file);
                  try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    if (content.id === flowId && (content.ver || "1.0") === flowVer) {
                      targetFile = filePath;
                      break;
                    }
                  } catch (e) {
                    // JSONのパースエラーは無視
                  }
                }
              }

              // 一致するファイルがなければ新規ファイルパスを生成
              if (!targetFile) {
                // キャメルケースのファイル名を生成 (例: credit-card-flow -> creditCardFlow_v1.1.json)
                const camelName = flowId.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase());
                const verSuffix = flowVer !== "1.0" ? `_v${flowVer}` : "";
                targetFile = path.join(dataDir, `${camelName}${verSuffix}.json`);
              }

              // ファイルに整形して上書き保存
              fs.writeFileSync(targetFile, JSON.stringify(flowData, null, 2), 'utf-8');
              
              console.log(`[API] Flow "${flowId}" (Ver ${flowVer}) saved to ${targetFile}`);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, path: targetFile }));
            } catch (err) {
              console.error("[API] Save error:", err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
})
