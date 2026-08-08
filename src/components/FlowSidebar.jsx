import React from "react";
import { Workflow } from "lucide-react";

export default function FlowSidebar({
  flows,
  activeFlowId,
  activeFlowVer,
  onSelectFlow
}) {
  // フローのリストを ID でユニーク化する（重複表示を防ぐため）
  const uniqueFlows = [];
  const seenIds = new Set();
  
  flows.forEach((flow) => {
    if (!seenIds.has(flow.id)) {
      seenIds.add(flow.id);
      uniqueFlows.push(flow);
    }
  });

  // あるフローIDに対応するすべてのバージョンを抽出
  const getVersionsForId = (flowId) => {
    return flows
      .filter((f) => f.id === flowId)
      .map((f) => f.ver || "1.0");
  };

  return (
    <div className="left-pane">
      <div className="pane-header">
        <span>業務フロー一覧</span>
        <Workflow size={16} />
      </div>

      <div className="flow-list-container">
        {uniqueFlows.map((flow) => {
          const isActive = flow.id === activeFlowId;
          const versions = getVersionsForId(flow.id);
          
          return (
            <div
              key={flow.id}
              className={`flow-item ${isActive ? "active" : ""}`}
              onClick={() => {
                if (!isActive) {
                  // 新しいフローを選択した時は、そのIDの最初のバージョンを選択
                  const defaultVer = versions[0] || "1.0";
                  onSelectFlow(flow.id, defaultVer);
                }
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div className="flow-item-title" style={{ flex: 1 }}>
                  {flow.title.split('[')[0].trim()}
                </div>
                
                {/* バージョン選択プルダウン (同じIDが複数バージョンある場合のみ表示) */}
                {versions.length > 1 && (
                  <select
                    value={isActive ? activeFlowVer : versions[0]}
                    onChange={(e) => {
                      e.stopPropagation(); // 親要素のクリックイベント（Flowの切り替え）を防ぐ
                      onSelectFlow(flow.id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()} // クリック時に親項目の切り替えが誤爆するのを防ぐ
                    style={{
                      fontSize: "0.6rem",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    {versions.map((v) => (
                      <option key={v} value={v}>
                        Ver {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flow-item-desc">
                {isActive 
                  ? flows.find(f => f.id === flow.id && (f.ver || "1.0") === activeFlowVer)?.description 
                  : flow.description
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
