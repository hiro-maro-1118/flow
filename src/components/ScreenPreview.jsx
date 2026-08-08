import React, { useState, useEffect, useRef } from "react";
import { Monitor, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Upload } from "lucide-react";

export default function ScreenPreview({ activeNode, currentFlowId, onUpdateImage, swimlanes = [] }) {
  const [zoom, setZoom] = useState(100);
  const fileInputRef = useRef(null);

  const hasImage = activeNode && activeNode.image;
  const lane = activeNode ? swimlanes.find((l) => l.id === activeNode.laneId) : null;
  // portalレーン、またはisImageLane属性があるレーンに所属しているノードか判定
  const isImageNode = lane && (lane.isImageLane || lane.id.toLowerCase().includes("portal") || lane.id.toLowerCase().includes("ui") || lane.id.toLowerCase().includes("internal"));

  useEffect(() => {
    setZoom(100);
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

  return (
    <div className="right-pane-top">
      <div className="pane-header">
        <span>画面プレビュー</span>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* 画像アップロードボタン (画像レーンのノード選択時のみ表示) */}
          {activeNode && isImageNode && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
              <button 
                type="button" 
                className="zoom-btn" 
                onClick={triggerFileInput}
                title="画面イメージをアップロード"
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

          {hasImage && (
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

      <div className="preview-container">
        {hasImage ? (
          <div className="browser-mockup">
            <div className="browser-bar">
              <div className="browser-dots-left">
                <div className="browser-dot red"></div>
                <div className="browser-dot yellow"></div>
                <div className="browser-dot green"></div>
              </div>
              <div className="browser-address">
                https://system.internal/{activeNode.image.startsWith("data:") ? "uploaded_screenshot.png" : activeNode.image.split('/').pop()}
              </div>
              <div style={{ width: '60px' }}></div>
            </div>
            
            <div className="browser-content">
              <img
                src={activeNode.image}
                alt={activeNode.title}
                className="preview-image-scrollable"
                style={{
                  width: `${zoom}%`,
                  maxWidth: 'none',
                  height: 'auto',
                  transition: 'width 0.15s ease-out'
                }}
                onError={(e) => {
                  console.error("Image load failed, fallback used", e);
                  e.target.src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80";
                }}
              />
            </div>
          </div>
        ) : (
          <div className="placeholder-box">
            {activeNode && isImageNode ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Upload size={40} strokeWidth={1.5} style={{ color: "var(--accent-color)", cursor: "pointer" }} onClick={triggerFileInput} />
                <div className="placeholder-text" style={{ marginTop: "10px" }}>
                  <strong>{activeNode.title}</strong> の画面イメージがありません。
                  <br />
                  上の「アップロード」ボタンまたは下のリンクからモック画像（PNG/JPG）を追加できます。
                  <button 
                    type="button" 
                    onClick={triggerFileInput}
                    style={{ 
                      display: "block", 
                      margin: "12px auto 0", 
                      background: "none", 
                      border: "none", 
                      color: "var(--accent-color)", 
                      textDecoration: "underline", 
                      cursor: "pointer", 
                      fontWeight: "bold",
                      fontSize: "0.7rem"
                    }}
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
                        ※「画面 UI」レーンのボックスをクリックすると、ここに画面イメージが表示されます。
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
  );
}
