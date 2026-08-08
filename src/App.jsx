import React, { useState, useEffect } from "react";
import { sampleFlows } from "./data/sampleFlows";
import FlowSidebar from "./components/FlowSidebar";
import SwimlaneFlowChart from "./components/SwimlaneFlowChart";
import ScreenPreview from "./components/ScreenPreview";
import NodeDetail from "./components/NodeDetail";

// ポータブルHTML用のソースコードインポート
import rawCss from "./index.css?raw";
import rawApp from "./App.jsx?raw";
import rawFlowSidebar from "./components/FlowSidebar.jsx?raw";
import rawSwimlaneFlowChart from "./components/SwimlaneFlowChart.jsx?raw";
import rawScreenPreview from "./components/ScreenPreview.jsx?raw";
import rawNodeDetail from "./components/NodeDetail.jsx?raw";

// ローカルストレージからの初期データ取得 (開発環境 localhost ではファイルデータを優先)
const getInitialFlows = () => {
  const isLocalhost = typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  if (!isLocalhost) {
    try {
      const saved = localStorage.getItem("flow_studio_data");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load flows from localStorage", e);
    }
  }
  return sampleFlows;
};

export default function App() {
  const [flows, setFlows] = useState(getInitialFlows);
  
  // フローのバージョン管理
  const [activeFlowId, setActiveFlowId] = useState(flows[0]?.id || sampleFlows[0].id);
  const [activeFlowVer, setActiveFlowVer] = useState(flows[0]?.ver || sampleFlows[0].ver || "1.0");
  const [activeNode, setActiveNode] = useState(null);

  // リサイズ・開閉ステート
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [topHeight, setTopHeight] = useState(420);
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  
  const [isResizingX, setIsResizingX] = useState(false);
  const [isResizingY, setIsResizingY] = useState(false);

  // 現在選択されているフロー (バージョンも考慮)
  const currentFlow = flows.find((f) => f.id === activeFlowId && (f.ver || "1.0") === activeFlowVer) || 
                      flows.find((f) => f.id === activeFlowId) || 
                      flows[0];

  // flows 状態の変更をローカル開発サーバーの実JSONファイル、またはポータブル時のlocalStorageに同期
  useEffect(() => {
    const isLocalhost = typeof window !== 'undefined' && 
                        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocalhost) {
      // ローカル開発環境：APIを呼び出して src/data/*.json 実ファイルを直接書き換える
      const current = flows.find((f) => f.id === activeFlowId && (f.ver || "1.0") === activeFlowVer);
      if (current) {
        fetch("/api/save-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(current)
        })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success) {
            console.log(`[Vite Server] Saved flow to file successfully: ${data.path}`);
          } else {
            console.error("[Vite Server] Save failed:", data.error);
          }
        })
        .catch((err) => {
          console.warn("[Vite Server] Could not connect to save API (using fallback):", err);
        });
      }
    } else {
      // ポータブルHTMLなどの環境：localStorage に退避する
      try {
        localStorage.setItem("flow_studio_data", JSON.stringify(flows));
      } catch (e) {
        console.error("Failed to save flows to localStorage", e);
      }
    }
  }, [flows, activeFlowId, activeFlowVer]);

  // ノードの画面イメージを更新するハンドラー (過去履歴スタック対応・バージョン独立)
  const handleUpdateNodeImage = (flowId, flowVer, nodeId, imageSrc) => {
    const dateStr = new Date().toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    setFlows((prevFlows) =>
      prevFlows.map((f) => {
        if (f.id !== flowId || (f.ver || "1.0") !== (flowVer || "1.0")) return f;
        return {
          ...f,
          nodes: f.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const history = n.imageHistory || [];
            const updatedHistory = n.image 
              ? [{ url: n.image, date: dateStr + " に更新" }, ...history]
              : history;
            return {
              ...n,
              image: imageSrc,
              imageHistory: updatedHistory
            };
          })
        };
      })
    );

    // 選択中のアクティブノード情報も同期
    setActiveNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      const history = prev.imageHistory || [];
      const updatedHistory = prev.image 
        ? [{ url: prev.image, date: dateStr + " に更新" }, ...history]
        : history;
      return {
        ...prev,
        image: imageSrc,
        imageHistory: updatedHistory
      };
    });
  };

  // ノードの任意のフィールド (概要、手順、メモ、履歴リストなど) を更新するハンドラー (バージョン独立)
  const handleUpdateNodeFields = (flowId, flowVer, nodeId, fields) => {
    setFlows((prevFlows) =>
      prevFlows.map((f) => {
        if (f.id !== flowId || (f.ver || "1.0") !== (flowVer || "1.0")) return f;
        return {
          ...f,
          nodes: f.nodes.map((n) =>
            n.id === nodeId ? { ...n, ...fields } : n
          )
        };
      })
    );
    // 選択中のノード情報も同期
    setActiveNode((prev) =>
      prev && prev.id === nodeId ? { ...prev, ...fields } : prev
    );
  };

  // 編集データをすべてリセットして初期状態に戻す
  const handleResetData = () => {
    if (window.confirm("これまでにアップロードした画像や編集したテキスト、メモ履歴をすべて消去し、最初の状態に戻しますか？")) {
      try {
        localStorage.removeItem("flow_studio_data");
      } catch (e) {
        console.error(e);
      }
      setFlows(sampleFlows);
      setActiveNode(null);
      setActiveFlowId(sampleFlows[0].id);
      setActiveFlowVer(sampleFlows[0].ver || "1.0");
    }
  };

  // マウスドラッグによるペインサイズ変更処理
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingX) {
        // 左右スプリッター (左サイドバーの幅)
        const newWidth = Math.max(200, Math.min(e.clientX, 500));
        setSidebarWidth(newWidth);
      }
      if (isResizingY) {
        // 上下スプリッター (右上フローチャートの高さ)
        const headerHeight = 50;
        const newHeight = Math.max(150, Math.min(e.clientY - headerHeight, window.innerHeight - headerHeight - 100));
        setTopHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingX(false);
      setIsResizingY(false);
    };

    if (isResizingX || isResizingY) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingX, isResizingY]);

  // フローおよびバージョンの切り替え
  const handleSelectFlow = (id, ver) => {
    setActiveFlowId(id);
    if (ver) {
      setActiveFlowVer(ver);
    } else {
      const matched = flows.find((f) => f.id === id);
      setActiveFlowVer(matched?.ver || "1.0");
    }
    setActiveNode(null); // 詳細説明とプレビューをリセット
  };

  // ノードの選択
  const handleSelectNode = (node) => {
    setActiveNode(node);
  };

  // 下ペインの開閉トグル
  const handleToggleBottom = () => {
    setIsBottomOpen(!isBottomOpen);
  };

  // HTMLのダウンロード処理
  const handleDownloadHTML = () => {
    // [DOWNLOAD_HTML_START]
    const cleanCode = (code, isApp = false) => {
      if (!code) return "";
      let cleaned = code
        .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+function/g, 'function')
        .replace(/export\s+default\s+/g, '')
        .trim();

      if (isApp) {
        // App.jsx の場合はポータブル版で不要かつ巨大なダウンロード処理を無害化する
        cleaned = cleaned.replace(
          /\/\/\s*\[DOWNLOAD_HTML_START\][\s\S]*?\/\/\s*\[DOWNLOAD_HTML_END\]/g,
          'alert("このポータブルHTML版ではダウンロード機能は使用できません。");'
        );
      }
      return cleaned;
    };

    const iconsCode = `
const Monitor = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <rect width="20" height="14" x="2" y="2" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const Workflow = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <rect width="8" height="8" x="3" y="3" rx="2" />
    <path d="M7 11v4a2 2 0 0 0 2 2h4" />
    <rect width="8" height="8" x="13" y="13" rx="2" />
  </svg>
);

const Info = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const HelpCircle = ({ size = 16, className, style, strokeWidth = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const ImageIcon = ({ size = 16, className, style, strokeWidth = 2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const ZoomIn = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="11" x2="11" y1="8" y2="14" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </svg>
);

const ZoomOut = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </svg>
);

const RotateCcw = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
);

const Upload = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const Edit3 = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const Save = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const Plus = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

const Trash2 = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const History = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <polyline points="3 3 3 8 8 8" />
  </svg>
);

const Check = ({ size = 16, className, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
`;

    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI-Flow Studio | 業務フロー描画ポータブル</title>
  <style>
    ${rawCss}
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <!-- 起動エラー表示用の領域 -->
  <div id="error-console" style="display:none; padding:20px; background:#fef2f2; border:2px solid #ef4444; color:#991b1b; font-family:monospace; margin:20px; border-radius:8px; z-index:9999; position:relative;">
    <h3 style="margin-top:0;">⚠️ 起動エラーが発生しました</h3>
    <pre id="error-message" style="white-space:pre-wrap;"></pre>
  </div>

  <div id="root"></div>

  <!-- エラー監視スクリプト -->
  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      const consoleEl = document.getElementById('error-console');
      const messageEl = document.getElementById('error-message');
      if (consoleEl && messageEl) {
        consoleEl.style.display = 'block';
        messageEl.textContent = message + '\\n\\n場所: ' + source + ':' + lineno + ':' + colno + '\\n\\nスタック: ' + (error ? error.stack : 'なし');
      }
      return false;
    };
  </script>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <script type="text/babel">
    const { useState, useRef, useLayoutEffect, useEffect, useCallback } = React;

    ${iconsCode}

    const sampleFlows = ${JSON.stringify(flows, null, 2)};

    // ポータブル環境での未定義エラー防止用ダミー定義
    const rawCss = "";
    const rawApp = "";
    const rawFlowSidebar = "";
    const rawSwimlaneFlowChart = "";
    const rawScreenPreview = "";
    const rawNodeDetail = "";

    ${cleanCode(rawFlowSidebar)}
    ${cleanCode(rawNodeDetail)}
    ${cleanCode(rawScreenPreview)}
    ${cleanCode(rawSwimlaneFlowChart)}
    ${cleanCode(rawApp, true)}

    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flow-studio-${currentFlow.id || 'export'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    // [DOWNLOAD_HTML_END]
  };

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="logo">
          <span>AI-Flow Studio</span>
        </div>
        <div className="header-meta" style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--accent-color)" }}>
            表示中: {currentFlow.title} {currentFlow.ver && `(Ver ${currentFlow.ver})`}
          </span>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <button 
            type="button" 
            className="toggle-btn"
            onClick={handleResetData}
            title="編集内容を初期化して最初の状態に戻す"
            style={{ 
              backgroundColor: "transparent", 
              color: "var(--text-muted)", 
              border: "1px solid var(--border-color)",
              padding: "4px 8px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.65rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "3px"
            }}
          >
            データ初期化
          </button>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <span>データ・描画分離モデル (Sample 1.0)</span>
          <button 
            type="button" 
            className="toggle-btn"
            onClick={handleDownloadHTML}
            style={{ 
              backgroundColor: "var(--accent-color, #2563eb)", 
              color: "white", 
              border: "none",
              padding: "4px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.75rem"
            }}
          >
            HTMLダウンロード
          </button>
        </div>
      </header>

      {/* メインの2ペインレイアウト (サイドバー幅はドラッグ可変) */}
      <div className="main-content-2pane">
        {/* 左ペイン: フローの切り替え */}
        <div style={{ width: sidebarWidth, display: "flex", flexShrink: 0 }}>
          <FlowSidebar
            flows={flows}
            activeFlowId={activeFlowId}
            activeFlowVer={activeFlowVer}
            onSelectFlow={handleSelectFlow}
          />
        </div>

        {/* 左右分割スプリッター */}
        <div 
          className={`splitter-x ${isResizingX ? "active" : ""}`}
          onMouseDown={() => setIsResizingX(true)}
        />

        {/* 右ペイン: 上部フロー ＆ 下部左右分割詳細 */}
        <div className="right-dashboard-pane">
          {/* 右上: 業務フロー描画 (高さはドラッグ可変、閉じている時は100%) */}
          <div 
            style={{ 
              height: isBottomOpen ? topHeight : "100%", 
              display: "flex", 
              flexDirection: "column",
              flexShrink: 0,
              flexGrow: isBottomOpen ? 0 : 1
            }}
          >
            <SwimlaneFlowChart
              flow={currentFlow}
              activeNodeId={activeNode ? activeNode.id : null}
              onSelectNode={handleSelectNode}
              isBottomOpen={isBottomOpen}
              onToggleBottom={handleToggleBottom}
            />
          </div>

          {/* 上下分割スプリッター (下ペインが開いている時のみ表示) */}
          {isBottomOpen && (
            <div 
              className={`splitter-y ${isResizingY ? "active" : ""}`}
              onMouseDown={() => setIsResizingY(true)}
            />
          )}

          {/* 右下: 左右2分割 (左画面プレビュー / 右説明) */}
          {isBottomOpen && (
            <div className="bottom-detail-split" style={{ flexGrow: 1 }}>
              <ScreenPreview 
                activeNode={activeNode} 
                currentFlowId={currentFlow.id}
                currentFlowVer={currentFlow.ver || "1.0"}
                onUpdateImage={handleUpdateNodeImage}
                onUpdateFields={handleUpdateNodeFields}
                swimlanes={currentFlow.swimlanes}
              />
              <NodeDetail 
                activeNode={activeNode} 
                swimlanes={currentFlow.swimlanes} 
                edges={currentFlow.edges}
                nodes={currentFlow.nodes}
                currentFlowId={currentFlow.id}
                currentFlowVer={currentFlow.ver || "1.0"}
                onUpdateFields={handleUpdateNodeFields}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
