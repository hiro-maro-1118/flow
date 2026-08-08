import React, { useState, useEffect } from "react";
import { Info, HelpCircle, Edit3, Save, Plus, Trash2 } from "lucide-react";

export default function NodeDetail({ 
  activeNode, 
  swimlanes = [], 
  edges = [], 
  nodes = [], 
  currentFlowId, 
  currentFlowVer,
  onUpdateFields 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [newMemo, setNewMemo] = useState("");

  // ノードが切り替わったときに編集内容や編集モードをリセット
  useEffect(() => {
    setIsEditing(false);
    setEditDesc(activeNode ? activeNode.description || "" : "");
    setEditDetails(activeNode ? activeNode.details || "" : "");
    setNewMemo("");
  }, [activeNode?.id]);

  // 所属するスイムレーンの情報
  const lane = activeNode
    ? swimlanes.find((l) => l.id === activeNode.laneId)
    : null;

  // IN/OUT の関係性を解析
  const inEdges = activeNode ? edges.filter((e) => e.to === activeNode.id) : [];
  const outEdges = activeNode ? edges.filter((e) => e.from === activeNode.id) : [];

  const handleSave = () => {
    if (onUpdateFields && activeNode && currentFlowId && currentFlowVer) {
      onUpdateFields(currentFlowId, currentFlowVer, activeNode.id, {
        description: editDesc,
        details: editDetails
      });
      setIsEditing(false);
    }
  };

  const handleAddMemo = () => {
    if (!newMemo.trim()) return;
    const currentMemos = activeNode.memos || [];
    const dateStr = new Date().toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const updatedMemos = [...currentMemos, { id: Date.now().toString(), text: newMemo, date: dateStr }];
    
    if (onUpdateFields && activeNode && currentFlowId && currentFlowVer) {
      onUpdateFields(currentFlowId, currentFlowVer, activeNode.id, { memos: updatedMemos });
      setNewMemo("");
    }
  };

  const handleDeleteMemo = (memoId) => {
    const currentMemos = activeNode.memos || [];
    const updatedMemos = currentMemos.filter((m) => m.id !== memoId);
    if (onUpdateFields && activeNode && currentFlowId && currentFlowVer) {
      onUpdateFields(currentFlowId, currentFlowVer, activeNode.id, { memos: updatedMemos });
    }
  };

  return (
    <div className="right-pane-bottom">
      <div className="pane-header">
        <span>ステップ詳細説明</span>
        
        {activeNode && (
          <div style={{ display: "flex", gap: "8px" }}>
            {isEditing ? (
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={handleSave}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px", 
                  padding: "2px 8px", 
                  backgroundColor: "var(--success-color, #16a34a)", 
                  color: "white", 
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                <Save size={10} />
                保存
              </button>
            ) : (
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={() => setIsEditing(true)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px", 
                  padding: "2px 8px",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                <Edit3 size={10} />
                編集
              </button>
            )}
          </div>
        )}
      </div>

      <div className="detail-container" style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
        {activeNode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* ヘッダー情報 */}
            <div className="detail-header" style={{ marginBottom: 0 }}>
              {lane && (
                <span
                  className="detail-lane-tag"
                  style={{
                    backgroundColor: lane.color || "var(--accent-color)",
                    boxShadow: `0 2px 8px ${lane.color}33`,
                    fontSize: "0.6rem"
                  }}
                >
                  {lane.name}
                </span>
              )}
              <h2 className="detail-title" style={{ fontSize: "0.9rem", marginTop: "4px" }}>{activeNode.title}</h2>
            </div>

            {/* 接続情報 (IN/OUT) */}
            <div className="detail-section" style={{ background: "var(--bg-primary)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <h3 className="detail-section-title" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "6px", borderBottom: "none", paddingBottom: 0 }}>接続経路の整合性</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.7rem" }}>
                <div>
                  <strong style={{ color: "var(--accent-color)", display: "inline-block", width: "45px" }}>IN元:</strong>
                  {inEdges.length > 0 ? (
                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                      {inEdges.map((e, idx) => {
                        const fromNode = nodes.find((n) => n.id === e.from);
                        return (
                          <li key={idx} style={{ listStyle: "disc", marginBottom: "2px" }}>
                            <span style={{ fontWeight: "600" }}>{fromNode ? fromNode.title : e.from}</span>
                            {e.label && <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>({e.label})</span>}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>なし（開始点）</span>
                  )}
                </div>
                
                <div style={{ marginTop: "4px" }}>
                  <strong style={{ color: "var(--danger-color)", display: "inline-block", width: "45px" }}>OUT先:</strong>
                  {outEdges.length > 0 ? (
                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                      {outEdges.map((e, idx) => {
                        const toNode = nodes.find((n) => n.id === e.to);
                        return (
                          <li key={idx} style={{ listStyle: "disc", marginBottom: "2px" }}>
                            <span style={{ fontWeight: "600" }}>{toNode ? toNode.title : e.to}</span>
                            {e.label && <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>({e.label})</span>}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>なし（終了点）</span>
                  )}
                </div>
              </div>
            </div>

            {/* 概要 */}
            <div className="detail-section">
              <h3 className="detail-section-title">概要</h3>
              {isEditing ? (
                <textarea
                  className="edit-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  style={{ width: "100%", minHeight: "60px", padding: "6px", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid var(--border-color)", resize: "vertical" }}
                />
              ) : (
                <p className="detail-body">{activeNode.description || "未登録"}</p>
              )}
            </div>

            {/* 詳細手順・仕様 */}
            <div className="detail-section">
              <h3 className="detail-section-title">詳細手順・仕様</h3>
              {isEditing ? (
                <textarea
                  className="edit-textarea"
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  style={{ width: "100%", minHeight: "100px", padding: "6px", fontSize: "0.75rem", borderRadius: "4px", border: "1px solid var(--border-color)", resize: "vertical" }}
                />
              ) : (
                <p className="detail-body" style={{ whiteSpace: "pre-line" }}>
                  {activeNode.details || "未登録"}
                </p>
              )}
            </div>

            {/* メモ機能 */}
            <div className="detail-section" style={{ marginTop: "6px", borderTop: "1px dashed var(--border-color)", paddingTop: "12px" }}>
              <h3 className="detail-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>検討メモ・指摘事項</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: "normal" }}>
                  {(activeNode.memos || []).length} 件
                </span>
              </h3>
              
              {/* メモ入力欄 */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <input 
                  type="text" 
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  placeholder="メモや修正指示をここに追加..."
                  style={{ flex: 1, padding: "5px 8px", fontSize: "0.7rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMemo()}
                />
                <button 
                  type="button" 
                  onClick={handleAddMemo}
                  style={{ 
                    padding: "4px 8px", 
                    backgroundColor: "var(--accent-color, #2563eb)", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* メモ一覧 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(activeNode.memos && activeNode.memos.length > 0) ? (
                  activeNode.memos.map((memo) => (
                    <div 
                      key={memo.id} 
                      style={{ background: "var(--bg-tertiary)", padding: "6px 8px", borderRadius: "4px", fontSize: "0.7rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}
                    >
                      <div style={{ flex: 1, wordBreak: "break-all" }}>
                        <div style={{ color: "var(--text-primary)" }}>{memo.text}</div>
                        <div style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "2px" }}>{memo.date}</div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteMemo(memo.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                      >
                        <Trash2 size={10} className="hover-danger" style={{ transition: "color 0.1s" }} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "10px", fontSize: "0.65rem", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "4px" }}>
                    メモはありません。設計 of 検討履歴を残せます。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="placeholder-box"
            style={{ margin: "40px auto 0", height: "auto" }}
          >
            <HelpCircle size={40} strokeWidth={1} />
            <div className="placeholder-text">
              業務フロー内のいずれかのボックスをクリックすると、そのステップの詳細な業務マニュアルやシステム仕様がここに表示されます。
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
