import React, { useState, useEffect, useRef } from "react";
import { Monitor, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Upload, Trash2, Check, History } from "lucide-react";

export default function ScreenPreview({ activeNode, currentFlowId, onUpdateImage, onUpdateFields, swimlanes = [] }) {
  const [zoom, setZoom] = useState(100);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null); // 履歴選択中の表示画像
  const fileInputRef = useRef(null);

  const lane = activeNode ? swimlanes.find((l) => l.id === activeNode.laneId) : null;
  const isImageNode = lane && (lane.isImageLane || lane.id.toLowerCase().includes("portal") || lane.id.toLowerCase().includes("ui") || lane.id.toLowerCase().includes("internal"));

  // ノードが切り替わったときに状態をリセット
  useEffect(() => {
    setZoom(100);
    setSelectedImageUrl(null); // 最新画像を表示
  }, [activeNode?.id]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 300));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleReset = () => setZoom(100);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (onUpdateImage && activeNode && currentFlowId) {
          onUpdateImage(currentFlowId, activeNode.id, event.target.result);
          setSelectedImageUrl(null); // アップロードした最新画像を表示
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 表示する画像（最新画像 または 履歴で選択された過去画像）
  const currentImage = selectedImageUrl || (activeNode ? activeNode.image : null);
  const isViewingHistory = selectedImageUrl !== null && selectedImageUrl !== activeNode.image;

  // 過去履歴画像の復元（最新版に設定）
  const handleRestoreHistory = () => {
    if (!selectedImageUrl || !activeNode || !currentFlowId || !onUpdateFields) return;
    
    // 現在の最新画像を履歴の先頭に退避させ、選択された過去画像を最新画像にする
    const dateStr = new Date().toLocaleString("ja-JP", {
      month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    const history = activeNode.imageHistory || [];
    // 復元対象を履歴から除外し、現在の最新画像を履歴に入れる
    const filteredHistory = history.filter(h => h.url !== selectedImageUrl);
    const updatedHistory = activeNode.image 
      ? [{ url: activeNode.image, date: dateStr + " に更新 (復元元)" }, ...filteredHistory]
      : filteredHistory;

    onUpdateFields(currentFlowId, activeNode.id, {
      image: selectedImageUrl,
      imageHistory: updatedHistory
    });
    setSelectedImageUrl(null); // 最新画像表示に戻す
  };

  // 現在表示中の過去履歴画像の削除
  const handleDeleteSelectedHistory = () => {
    if (!selectedImageUrl || !activeNode || !currentFlowId || !onUpdateFields) return;
    const history = activeNode.imageHistory || [];
    const updatedHistory = history.filter(h => h.url !== selectedImageUrl);
    
    onUpdateFields(currentFlowId, activeNode.id, {
      imageHistory: updatedHistory
    });
    setSelectedImageUrl(null); // 削除後は最新画像に戻す
  };

  // プルダウン変更時のハンドラー
  const handleHistorySelectChange = (e) => {
    const val = e.target.value;
    if (val === "latest") {
      setSelectedImageUrl(null);
    } else {
      const idx = parseInt(val, 10);
      const history = activeNode.imageHistory || [];
      if (history[idx]) {
        setSelectedImageUrl(history[idx].url);
      }
    }
  };

  // 現在表示されている画像のプルダウン用バリューを取得
  const getSelectValue = () => {
    if (selectedImageUrl === null) return "latest";
    const history = activeNode.imageHistory || [];
    const idx = history.findIndex(h => h.url === selectedImageUrl);
    return idx !== -1 ? idx.toString() : "latest";
  };

  return (
    <div className="right-pane-top" style={{ display: "flex", flexDirection: "column" }}>
      <div className="pane-header">
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>画面プレビュー</span>
          {isViewingHistory && (
            <span style={{ fontSize: "0.6rem", backgroundColor: "var(--danger-color, #dc2626)", color: "white", padding: "1px 5px", borderRadius: "3px", fontWeight: "bold" }}>
              過去の履歴表示中
            </span>
          )}
        </span>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* 画像履歴切り替えプルダウン (履歴がある場合のみ表示) */}
          {activeNode && activeNode.imageHistory && activeNode.imageHistory.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <History size={11} style={{ color: "var(--text-muted)" }} />
              <select
                value={getSelectValue()}
                onChange={handleHistorySelectChange}
                style={{
                  fontSize: "0.65rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  cursor: "pointer",
                  maxWidth: "150px"
                }}
              >
                <option value="latest">最新版 (表示中)</option>
                {activeNode.imageHistory.map((h, idx) => (
                  <option key={idx} value={idx}>
                    {h.date}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 過去画像表示時のアクションボタン（復元・削除） */}
          {isViewingHistory && (
            <div style={{ display: "flex", gap: "4px" }}>
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={handleRestoreHistory}
                title="この過去画面を最新版に設定"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "3px", 
                  padding: "2px 8px", 
                  height: "20px", 
                  fontSize: "0.65rem", 
                  backgroundColor: "var(--success-color, #16a34a)", 
                  color: "white", 
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                <Check size={10} />
                復元
              </button>
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={handleDeleteSelectedHistory}
                title="この過去画面を履歴から削除"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "3px", 
                  padding: "2px 8px", 
                  height: "20px", 
                  fontSize: "0.65rem", 
                  backgroundColor: "var(--danger-color, #dc2626)", 
                  color: "white", 
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                <Trash2 size={10} />
                削除
              </button>
            </div>
          )}

          {activeNode && isImageNode && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: "none" }} />
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={triggerFileInput}
                title="新しい画面イメージをアップロード"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px", 
                  padding: "2px 8px", 
                  height: "20px", 
                  fontSize: "0.65rem", 
                  backgroundColor: "var(--accent-color, #2563eb)", 
                  color: "white", 
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                <Upload size={10} />
                アップロード
              </button>
            </>
          )}

          {currentImage && (
            <div className="zoom-controls">
              <button type="button" className="zoom-btn" onClick={handleZoomOut} title="ズームアウト">
                <ZoomOut size={12} />
              </button>
              <span className="zoom-text">{zoom}%</span>
              <button type="button" className="zoom-btn" onClick={handleZoomIn} title="ズームイン">
                <ZoomIn size={12} />
              </button>
              <button type="button" className="zoom-btn" onClick={handleReset} title="リセット" style={{ marginLeft: '4px' }}>
                <RotateCcw size={10} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="preview-container" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* メインプレビューエリア (100% 全面表示) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {currentImage ? (
            <div className="browser-mockup" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", margin: 0, borderRadius: 0, border: "none" }}>
              <div className="browser-bar" style={{ borderRadius: 0 }}>
                <div className="browser-dots-left">
                  <div className="browser-dot red"></div>
                  <div className="browser-dot yellow"></div>
                  <div className="browser-dot green"></div>
                </div>
                <div className="browser-address" style={{ fontSize: "0.65rem" }}>
                  https://system.internal/{currentImage.startsWith("data:") ? "screenshot.png" : currentImage.split('/').pop()}
                </div>
                <div style={{ width: '60px' }}></div>
              </div>
              
              <div className="browser-content" style={{ flex: 1, overflow: "auto" }}>
                <img
                  src={currentImage}
                  alt="Preview"
                  className="preview-image-scrollable"
                  style={{
                    width: `${zoom}%`,
                    maxWidth: 'none',
                    height: 'auto',
                    transition: 'width 0.15s ease-out'
                  }}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80";
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="placeholder-box" style={{ height: "100%" }}>
              {activeNode && isImageNode ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Upload size={40} strokeWidth={1.5} style={{ color: "var(--accent-color)", cursor: "pointer" }} onClick={triggerFileInput} />
                  <div className="placeholder-text" style={{ marginTop: "10px" }}>
                    <strong>{activeNode.title}</strong> の画面イメージがありません。
                    <button 
                      type="button" 
                      onClick={triggerFileInput}
                      style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "var(--accent-color)", textDecoration: "underline", cursor: "pointer", fontWeight: "bold", fontSize: "0.7rem" }}
                    >
                      画像をアップロードする
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ImageIcon size={40} strokeWidth={1.5} />
                  <div className="placeholder-text">
                    {activeNode ? (
                      <>
                        <strong>{activeNode.title}</strong> には画面イメージが紐づいていません。
                        <br />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                          ※「画面 UI」レーンのボックスをクリックすると、対応する操作画面が表示されます。
                        </span>
                      </>
                    ) : (
                      "スイムレーンの「画面 UI」レーンにあるボックスをクリックすると、対応する操作画面のイメージがここに表示されます。"
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
