import React from "react";
import { Info, HelpCircle } from "lucide-react";

export default function NodeDetail({ activeNode, swimlanes = [] }) {
  // 所属するスイムレーンの情報を探す
  const lane = activeNode
    ? swimlanes.find((l) => l.id === activeNode.laneId)
    : null;

  return (
    <div className="right-pane-bottom">
      <div className="pane-header">
        <span>ステップ詳細説明</span>
        <Info size={16} />
      </div>

      <div className="detail-container">
        {activeNode ? (
          <div>
            <div className="detail-header">
              {lane && (
                <span
                  className="detail-lane-tag"
                  style={{
                    backgroundColor: lane.color || "var(--accent-color)",
                    boxShadow: `0 2px 8px ${lane.color}33`
                  }}
                >
                  {lane.name}
                </span>
              )}
              <h2 className="detail-title">{activeNode.title}</h2>
            </div>

            <div className="detail-section">
              <h3 className="detail-section-title">概要</h3>
              <p className="detail-body">{activeNode.description}</p>
            </div>

            {activeNode.details && (
              <div className="detail-section">
                <h3 className="detail-section-title">詳細手順・仕様</h3>
                <p className="detail-body" style={{ whiteSpace: "pre-line" }}>
                  {activeNode.details}
                </p>
              </div>
            )}

            <div className="detail-section">
              <h3 className="detail-section-title">ステップメタデータ</h3>
              <div className="detail-meta-list">
                <div className="detail-meta-item">
                  <span className="detail-meta-label">ステップID</span>
                  <span className="detail-meta-val">{activeNode.id}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">担当レーン</span>
                  <span className="detail-meta-val">{lane ? lane.name : "未定"}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">画面連携</span>
                  <span className="detail-meta-val">
                    {activeNode.image ? "あり" : "なし"}
                  </span>
                </div>
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
