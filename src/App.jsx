import React, { useState, useEffect } from "react";
import { sampleFlows } from "./data/sampleFlows";
import FlowSidebar from "./components/FlowSidebar";
import SwimlaneFlowChart from "./components/SwimlaneFlowChart";
import ScreenPreview from "./components/ScreenPreview";
import NodeDetail from "./components/NodeDetail";

export default function App() {
  const [flows, setFlows] = useState(sampleFlows);
  const [activeFlowId, setActiveFlowId] = useState(sampleFlows[0].id);
  const [activeNode, setActiveNode] = useState(null);

  // リサイズ・開閉ステート
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [topHeight, setTopHeight] = useState(420);
  const [isBottomOpen, setIsBottomOpen] = useState(true);
  
  const [isResizingX, setIsResizingX] = useState(false);
  const [isResizingY, setIsResizingY] = useState(false);

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

  // 現在選択されているフロー
  const currentFlow = flows.find((f) => f.id === activeFlowId) || flows[0];

  // フローの切り替え
  const handleSelectFlow = (id) => {
    setActiveFlowId(id);
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

  return (
    <div className="app-container">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="logo">
          <span>AI-Flow Studio</span>
        </div>
        <div className="header-meta">
          データ・描画分離モデル (Sample Version 1.0)
        </div>
      </header>

      {/* メインの2ペインレイアウト (サイドバー幅はドラッグ可変) */}
      <div className="main-content-2pane">
        {/* 左ペイン: フローの切り替え */}
        <div style={{ width: sidebarWidth, display: "flex", flexShrink: 0 }}>
          <FlowSidebar
            flows={flows}
            activeFlowId={activeFlowId}
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
              <ScreenPreview activeNode={activeNode} />
              <NodeDetail activeNode={activeNode} swimlanes={currentFlow.swimlanes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
