import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 編集したフローデータ、およびアップロードされた画像をサーバー側の実ファイルに書き戻すカスタム Vite プラグイン
const saveFlowPlugin = () => ({
  name: 'vite-plugin-save-flow',
  configureServer(server) {
    console.log("\n>>> [Vite Server] Custom save-flow API middleware registered successfully. <<<\n");
    
    server.middlewares.use((req, res, next) => {
      // 1. 画像の物理ファイル書き出し用API (BASE64を images フォルダに保存)
      if (req.url && req.url.startsWith('/api/upload-image') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { fileName, fileData } = JSON.parse(body);
            
            // BASE64データからバイナリ情報を抽出
            const matches = fileData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
              throw new Error('Invalid base64 image data');
            }
            const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            const dataBuffer = Buffer.from(matches[2], 'base64');
            
            // ファイル名を安全に生成 (例: credit-card-flow_card-node-2_178609828.png)
            const safeName = fileName.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const finalFileName = `${safeName}_${Date.now()}.${ext}`;
            
            // 保存先は public/images フォルダ
            const targetDir = path.resolve(__dirname, 'public', 'images');
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            const targetPath = path.join(targetDir, finalFileName);
            
            // 物理書き込み
            fs.writeFileSync(targetPath, dataBuffer);
            
            console.log(`[API] Uploaded image saved to file: ${targetPath}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              imagePath: `images/${finalFileName}` 
            }));
          } catch (err) {
            console.error("[API] Image upload error:", err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
      // 2. フローデータ (JSON) の保存用API
      else if (req.url && req.url.startsWith('/api/save-flow') && req.method === 'POST') {
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
              const camelName = flowId.replace(/[-_]([a-z])/g, (g) => g[1].toUpperCase());
              const verSuffix = flowVer !== "1.0" ? `_v${flowVer}` : "";
              targetFile = path.join(dataDir, `${camelName}${verSuffix}.json`);
            }

            // ファイルに上書き保存
            fs.writeFileSync(targetFile, JSON.stringify(flowData, null, 2), 'utf-8');
            
            console.log(`[API] Flow "${flowId}" (Ver ${flowVer}) saved to ${targetFile}`);

            // --- 未使用アップロード画像の自動クリーンアップ (GC) ---
            try {
              const activeImagePaths = new Set();
              if (Array.isArray(flowData.nodes)) {
                flowData.nodes.forEach(node => {
                  if (node.image) {
                    activeImagePaths.add(node.image);
                  }
                  if (Array.isArray(node.imageHistory)) {
                    node.imageHistory.forEach(hist => {
                      if (hist.url) {
                        activeImagePaths.add(hist.url);
                      }
                    });
                  }
                });
              }

              const imagesDir = path.resolve(__dirname, 'public', 'images');
              if (fs.existsSync(imagesDir)) {
                const imageFiles = fs.readdirSync(imagesDir);
                const safeFlowId = flowId.replace(/[^a-zA-Z0-9_\-]/g, '_');
                
                imageFiles.forEach(file => {
                  if (file.startsWith(`${safeFlowId}_`)) {
                    const relativePath = `images/${file}`;
                    if (!activeImagePaths.has(relativePath)) {
                      const fullPath = path.join(imagesDir, file);
                      fs.unlinkSync(fullPath);
                      console.log(`[API-GC] Deleted unused image: ${relativePath}`);
                    }
                  }
                });
              }
            } catch (gcErr) {
              console.error("[API-GC] Error cleaning up unused images:", gcErr);
            }

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
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), saveFlowPlugin()],
})
