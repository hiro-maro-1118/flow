import React, { useState, useEffect } from "react";
import { Monitor, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function ScreenPreview({ activeNode }) {
  const [zoom, setZoom] = useState(100);
  const hasImage = activeNode && activeNode.image;

  // ノードが切り替わったときにズームを100%にリセット
  useEffect(() => {
    setZoom(100);
  }, [activeNode?.id]);

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 25, 50));
  };

  const handleReset = () => {
    setZoom(100);
  };

  return (
    <div className="right-pane-top">
      <div className="pane-header">
        <span>画面プレビュー</span>
        
        {/* ズームコントロール */}
        {hasImage && (
          <div className="zoom-controls">
            <button 
              type="button"
              className="zoom-btn" 
              onClick={handleZoomOut} 
              title="ズームアウト"
            >
              <ZoomOut size={12} />
            </button>
            <span className="zoom-text">{zoom}%</span>
            <button 
              type="button" 
              className="zoom-btn" 
              onClick={handleZoomIn} 
              title="ズームイン"
            >
              <ZoomIn size={12} />
            </button>
            <button 
              type="button" 
              className="zoom-btn" 
              onClick={handleReset} 
              title="リセット"
              style={{ marginLeft: '4px' }}
            >
              <RotateCcw size={10} />
            </button>
          </div>
        )}
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
                https://system.internal/{activeNode.image.split('/').pop()}
              </div>
              <div style={{ width: '60px' }}></div> {/* 左右バランス用 */}
            </div>
            
            <div className="browser-content">
              <img
                src={activeNode.image}
                alt={activeNode.title}
                className="preview-image-scrollable"
                style={{
                  width: `${zoom}%`,
                  maxWidth: 'none', // 100%制限を解除して拡大
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
          </div>
        )}
      </div>
    </div>
  );
}
