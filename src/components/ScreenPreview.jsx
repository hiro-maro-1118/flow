import React, { useState, useEffect, useRef } from "react";
import { Monitor, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Upload, History, Trash2, Check } from "lucide-react";

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

  // 過去履歴画像の削除
  const handleDeleteHistory = (historyUrl) => {
    if (!activeNode || !currentFlowId || !onUpdateFields) return;
    const history = activeNode.imageHistory || [];
    const updatedHistory = history.filter(h => h.url !== historyUrl);
    
    onUpdateFields(currentFlowId, activeNode.id, {
      imageHistory: updatedHistory
    });
    
    // 削除した画像を表示中だった場合は最新に戻す
    if (selectedImageUrl === historyUrl) {
      setSelectedImageUrl(null);
    }
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
          {/* 過去画像の復元/最新化アクション */}
          {isViewingHistory && (
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
              最新版に復元
            </button>
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
        {/* メインプレビューエリア */}
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

        {/* 右側: 過去の画像履歴一覧パネル (履歴がある場合のみ表示) */}
        {activeNode && activeNode.imageHistory && activeNode.imageHistory.length > 0 && (
          <div 
            style={{ 
              width: "120px", 
              borderLeft: "1px solid var(--border-color)", 
              backgroundColor: "var(--bg-secondary)", 
              display: "flex", 
              flexDirection: "column",
              height: "100%",
              overflowY: "auto",
              padding: "8px",
              flexShrink: 0
            }}
          >
            <div style={{ fontSize: "0.6rem", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "3px" }}>
              <History size={10} />
              過去の画面履歴
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* 最新画像（現在）のボタン */}
              <div 
                onClick={() => setSelectedImageUrl(null)}
                style={{ 
                  cursor: "pointer",
                  border: selectedImageUrl === null ? "1.5px solid var(--accent-color)" : "1px solid var(--border-color)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  backgroundColor: selectedImageUrl === null ? "var(--accent-glow)" : "transparent",
                  padding: "2px"
                }}
              >
                <div style={{ height: "50px", overflow: "hidden", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {activeNode.image ? (
                    <img src={activeNode.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageIcon size={16} style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
                <div style={{ fontSize: "0.5rem", textAlign: "center", marginTop: "2px", fontWeight: "bold", color: "var(--text-primary)" }}>最新版 (表示中)</div>
              </div>

              {/* 過去画像の一覧 */}
              {activeNode.imageHistory.map((h, idx) => {
                const isSelected = selectedImageUrl === h.url;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedImageUrl(h.url)}
                    style={{ 
                      cursor: "pointer",
                      border: isSelected ? "1.5px solid var(--danger-color)" : "1px solid var(--border-color)",
                      borderRadius: "4px",
                      overflow: "hidden",
                      backgroundColor: isSelected ? "rgba(220, 38, 38, 0.05)" : "transparent",
                      padding: "2px",
                      position: "relative"
                    }}
                  >
                    <div style={{ height: "50px", overflow: "hidden", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={h.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ fontSize: "0.48rem", textAlign: "center", marginTop: "2px", color: "var(--text-muted)", wordBreak: "break-all" }}>{h.date}</div>
                    
                    {/* 履歴削除ボタン */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(h.url);
                      }}
                      style={{
                        position: "absolute",
                        top: "2px",
                        right: "2px",
                        backgroundColor: "rgba(255,255,255,0.9)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "2px",
                        cursor: "pointer",
                        padding: "1px",
                        display: "flex",
                        alignItems: "center",
                        zIndex: 10
                      }}
                    >
                      <Trash2 size={8} style={{ color: "var(--danger-color)" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
