import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { Monitor } from "lucide-react";

export default function SwimlaneFlowChart({
  flow,
  activeNodeId,
  onSelectNode,
  isBottomOpen,
  onToggleBottom
}) {
  const { swimlanes = [], nodes = [], edges = [] } = flow || {};
  const [nodePositions, setNodePositions] = useState({});

  // パン移動・ズーム
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [zoom, setZoom] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const gridRef = useRef(null);
  const canvasAreaRef = useRef(null); // ← ヘッダー下の描画エリア専用 ref
  const nodeRefs = useRef({});

  // 最大のcolumn数 (ステップ列数)
  const maxCol = nodes.reduce((max, node) => Math.max(max, node.row || 1), 1);

  // スイムレーンのマップ (ID -> インデックス)
  const laneMap = {};
  swimlanes.forEach((lane, idx) => {
    laneMap[lane.id] = idx;
  });

  // 判断分岐ノードかどうかの判定ヘルパー
  const isDecisionNode = (node) =>
    node.type === "decision" || node.title.includes("判断分岐");

  // フローが切り替わったときにパン・ズームをリセット
  useEffect(() => {
    setPan({ x: 20, y: 20 });
    setZoom(1.0);
  }, [flow?.id]);

  // ノード要素の参照を格納するマップを更新する関数
  const setNodeRef = (id, el) => {
    if (el) {
      nodeRefs.current[id] = el;
    } else {
      delete nodeRefs.current[id];
    }
  };

  // 各ノードのグリッド相対座標を計算する関数 (offsetLeft/offsetTop ベース)
  const updatePositions = () => {
    if (!gridRef.current) return;

    const positions = {};
    nodes.forEach((node) => {
      const el = nodeRefs.current[node.id];
      if (el) {
        const x = el.offsetLeft;
        const y = el.offsetTop;
        const w = el.offsetWidth;
        const h = el.offsetHeight;

        positions[node.id] = {
          x,
          y,
          width: w,
          height: h,
          top: { x: x + w / 2, y: y },
          bottom: { x: x + w / 2, y: y + h },
          left: { x: x, y: y + h / 2 },
          right: { x: x + w, y: y + h / 2 }
        };
      }
    });

    setNodePositions(positions);
  };

  useLayoutEffect(() => {
    const timer = setTimeout(() => updatePositions(), 50);
    const observer = new ResizeObserver(() => updatePositions());
    if (gridRef.current) observer.observe(gridRef.current);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [flow, nodes.length, isBottomOpen]);

  // ---- マウスドラッグ（パン） ----
  const handleMouseDown = (e) => {
    if (e.target.closest(".flow-node") || e.target.closest(".toggle-btn") || e.target.closest(".zoom-btn")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUpOrLeave = () => setIsDragging(false);

  // ---- マウスホイール（ズーム） ----
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleDelta = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.25, Math.min(3.0, prevZoom * scaleDelta));
      // カーソル位置を中心にズーム
      const rect = canvasAreaRef.current?.getBoundingClientRect();
      if (!rect) return newZoom;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setPan((prevPan) => ({
        x: mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom),
        y: mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom)
      }));
      return newZoom;
    });
  }, []);

  // passive: false で wheel イベントを登録（preventDefault のため）
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ---- エッジ接続点の決定 (IN/OUT を役割で固定) ----
  const getEdgePoints = (edge) => {
    const fromNode = nodes.find((n) => n.id === edge.from);
    const toNode = nodes.find((n) => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const fromPos = nodePositions[edge.from];
    const toPos = nodePositions[edge.to];
    if (!fromPos || !toPos) return null;

    const fromIsDiamond = isDecisionNode(fromNode);
    const toIsDiamond = isDecisionNode(toNode);

    const isReturn = edge.isReturn;

    // 戻り矢印のポート設計:
    // - 通常ノード from: rightポートから出発 → IN(上からアクセスするエッジが top を使うのとポートを分ける)
    // - ひし形ノード from: top頂点から出発
    if (isReturn || fromNode.row > toNode.row) {
      if (fromIsDiamond) {
        return {
          start: fromPos.top,
          end: toPos.top,
          type: "return",
          fromNode, toNode, fromPos, toPos
        };
      } else {
        // 通常ノード: rightポートから出発して先端のtopに届く弧
        return {
          start: fromPos.right,
          end: toIsDiamond ? toPos.left : toPos.top,
          type: "return-right",
          fromNode, toNode, fromPos, toPos
        };
      }
    }

    // 中心点間ベクトル
    const fromCX = fromPos.x + fromPos.width / 2;
    const fromCY = fromPos.y + fromPos.height / 2;
    const toCX = toPos.x + toPos.width / 2;
    const toCY = toPos.y + toPos.height / 2;
    const dx = toCX - fromCX;
    const dy = toCY - fromCY;

    // ---- ひし形ノードからの OUT: 方向によって頂点を分ける ----
    if (fromIsDiamond) {
      let startPort;
      if (Math.abs(dy) <= Math.abs(dx) * 0.6 && dx > 0) {
        // ほぼ水平右向き → 右頂点
        startPort = fromPos.right;
      } else if (dy > 0) {
        // 下向き → 下頂点
        startPort = fromPos.bottom;
      } else {
        // 上向き → 上頂点
        startPort = fromPos.top;
      }

      // IN側: 通常ノードの場合は方向に応じた最短ポート
      let endPort;
      if (toIsDiamond) {
        endPort = dx > 0 ? toPos.left : toPos.right;
      } else {
        endPort = Math.abs(dy) < 40 ? toPos.left : (dy > 0 ? toPos.top : toPos.bottom);
      }

      const type = Math.abs(dy) < 40 ? "horizontal"
        : (Math.abs(dx) < 40 ? "vertical" : "diagonal-vertical");

      return { start: startPort, end: endPort, type, fromNode, toNode, fromPos, toPos };
    }

    // ---- ひし形ノードへの IN: 常に左頂点に接続 ----
    if (toIsDiamond) {
      const endPort = toPos.left;
      const startPort = fromPos.right;
      return { start: startPort, end: endPort, type: "horizontal", fromNode, toNode, fromPos, toPos };
    }

    // ---- 通常ノード同士の接続 ----
    if (Math.abs(dy) < 40 && dx > 0) {
      return { start: fromPos.right, end: toPos.left, type: "horizontal", fromNode, toNode, fromPos, toPos };
    }
    if (Math.abs(dx) < 40) {
      return {
        start: dy > 0 ? fromPos.bottom : fromPos.top,
        end: dy > 0 ? toPos.top : toPos.bottom,
        type: "vertical", fromNode, toNode, fromPos, toPos
      };
    }
    if (dx > 0) {
      if (Math.abs(dy) > dx * 0.7) {
        return {
          start: dy > 0 ? fromPos.bottom : fromPos.top,
          end: dy > 0 ? toPos.top : toPos.bottom,
          type: "diagonal-vertical", fromNode, toNode, fromPos, toPos
        };
      }
      return { start: fromPos.right, end: toPos.left, type: "diagonal-horizontal", fromNode, toNode, fromPos, toPos };
    }
    return { start: fromPos.right, end: toPos.left, type: "horizontal", fromNode, toNode, fromPos, toPos };
  };

  // ---- パス生成 ----
  const generatePath = (edge) => {
    const points = getEdgePoints(edge);
    if (!points) return "";
    const { start, end, type } = points;

    if (type === "horizontal" || type === "diagonal-horizontal") {
      const sx = start.x + 2, ex = end.x - 6;
      const mx = sx + (ex - sx) / 2;
      return `M ${sx} ${start.y} C ${mx} ${start.y}, ${mx} ${end.y}, ${ex} ${end.y}`;
    }
    if (type === "vertical" || type === "diagonal-vertical") {
      const dir = start.y < end.y ? 1 : -1;
      const sy = start.y + dir * 2, ey = end.y - dir * 6;
      const my = sy + (ey - sy) / 2;
      return `M ${start.x} ${sy} C ${start.x} ${my}, ${end.x} ${my}, ${end.x} ${ey}`;
    }
    if (type === "return") {
      // ひし形ノードからの戻り: top → top
      const sy = start.y - 2, ey = end.y - 8;
      const diffX = Math.abs(start.x - end.x);
      const archH = Math.max(40, Math.min(80, diffX * 0.2));
      return `M ${start.x} ${sy} C ${start.x} ${sy - archH}, ${end.x} ${ey - archH}, ${end.x} ${ey}`;
    }
    if (type === "return-right") {
      // 通常ノードからの戻り: right ポートから出て 届き先 top または left に到着
      const sx = start.x, sy = start.y;
      const ex = end.x, ey = end.y - 8;
      // 弧の高さ: 横方向の距離に応じて自動調整
      const diffX = Math.abs(sx - ex);
      const diffY = Math.abs(sy - ey);
      const archH = Math.max(40, Math.min(90, diffX * 0.15 + diffY * 0.1));
      // CP1: 右側へ少しだけ还れてから上へ上昇
      const cp1x = sx + Math.min(40, diffX * 0.15 + 15);
      const cp1y = sy - archH;
      // CP2: 先端の上方から入横
      const cp2x = ex;
      const cp2y = ey - archH;
      return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`;
    }
    return "";
  };

  const ROW_H = 52;
  const ROW_GAP = 16;
  const gridCols = `130px repeat(${maxCol}, minmax(160px, 1fr))`;
  const gridRows = `repeat(${swimlanes.length}, minmax(${ROW_H}px, auto))`;

  return (
    <div className="center-pane" style={{ display: "flex", flexDirection: "column" }}>
      {/* ── ヘッダー: transformの外に配置してドラッグしても消えないようにする ── */}
      <div className="pane-header" style={{ flexShrink: 0, zIndex: 10 }}>
        <span>業務フロー描画（横書きスイムレーン図）&nbsp;
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>
            ドラッグ: パン移動 ｜ ホイール: 拡大縮小 ｜ エッジをホバー: 遷移条件表示
          </span>
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* ズームリセットボタン */}
          <button
            type="button"
            className="toggle-btn zoom-btn"
            onClick={() => { setZoom(1.0); setPan({ x: 20, y: 20 }); }}
          >
            リセット
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button type="button" className="toggle-btn" onClick={onToggleBottom}>
            {isBottomOpen ? "詳細表示を閉じる ▲" : "詳細表示を開く ▼"}
          </button>
        </div>
      </div>

      {/* ── キャンバスエリア: position:relative, overflow:hidden で独立した描画領域 ── */}
      <div
        ref={canvasAreaRef}
        className={isDragging ? "canvas-area grabbing" : "canvas-area"}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {/* transform はこの div だけに適用 → ヘッダーに影響しない */}
        <div
          className="canvas-wrapper"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: `${(maxCol + 1) * 180 + 100}px`,
            height: `${swimlanes.length * (ROW_H + ROW_GAP) + 200}px`  /* 上100px+下60px+余裕分 */
          }}
        >
          <div
            ref={gridRef}
            className="swimlanes-flow-grid"
            style={{
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              rowGap: `${ROW_GAP}px`,
              columnGap: "25px"
            }}
          >
            {/* 背景レーンガイドライン */}
            <div
              className="grid-bg-lanes-y"
              style={{ gridTemplateRows: gridRows, rowGap: `${ROW_GAP}px` }}
            >
              {swimlanes.map((lane) => (
                <div key={lane.id} className="bg-lane-row" />
              ))}
            </div>

            {/* スイムレーンヘッダー */}
            {swimlanes.map((lane, idx) => (
              <div
                key={lane.id}
                className="lane-header-card-y"
                style={{ "--row-start": idx + 1, "--lane-color": lane.color }}
              >
                {lane.name}
              </div>
            ))}

            {/* ノード描画 */}
            {nodes.map((node) => {
              const laneIndex = laneMap[node.laneId] !== undefined ? laneMap[node.laneId] : 0;
              const lane = swimlanes[laneIndex] || {};
              const isActive = node.id === activeNodeId;
              const isDiamond = isDecisionNode(node);

              const hasSlot = node.slot !== undefined;
              const slotStyle = hasSlot
                ? { justifySelf: node.slot === 0 ? "start" : "end" }
                : {};

              return (
                <div
                  key={node.id}
                  ref={(el) => setNodeRef(node.id, el)}
                  className={`flow-node ${isActive ? "active" : ""} ${isDiamond ? "decision" : ""}`}
                  style={{
                    "--col-start": node.row + 1,
                    "--row-start": laneIndex + 1,
                    "--lane-color": lane.color || "#2563eb",
                    ...slotStyle
                  }}
                  onClick={() => onSelectNode(node)}
                >
                  {isDiamond ? (
                    <DecisionDiamond node={node} lane={lane} isActive={isActive} />
                  ) : (
                    <>
                      <div className="flow-node-title">{node.title}</div>
                      {lane.isImageLane && node.image && (
                        <div className="node-icon-wrapper">
                          <Monitor size={11} className="node-icon-indicator" style={{ "--lane-color": lane.color }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* SVGコネクタ */}
            <svg
              className="connector-layer"
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3, overflow: "visible" }}
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)" />
                </marker>
                <marker id="arrow-return" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--danger-color)" />
                </marker>
              </defs>

              {edges.map((edge, index) => {
                const pathD = generatePath(edge);
                if (!pathD) return null;
                const points = getEdgePoints(edge);
                if (!points) return null;
                const { start, end, type } = points;
                const isReturn = edge.isReturn || points.fromNode.row > points.toNode.row || type === "return-right";

                let labelX, labelY, textAnchor = "middle";
                if (type === "horizontal" || type === "diagonal-horizontal") {
                  labelX = (start.x + end.x) / 2;
                  labelY = (start.y + end.y) / 2 - 7;
                } else if (type === "return") {
                  const diffX = Math.abs(start.x - end.x);
                  const archH = Math.max(40, Math.min(80, diffX * 0.2));
                  labelX = (start.x + end.x) / 2;
                  labelY = (start.y + end.y) / 2 - archH + 10;
                } else if (type === "return-right") {
                  // 弧の中間あたり（右上に膨らむ）にラベルを配置
                  labelX = (start.x + end.x) / 2 + 12;
                  labelY = Math.min(start.y, end.y) - 18;
                  textAnchor = "middle";
                } else {
                  labelX = (start.x + end.x) / 2 + 6;
                  labelY = (start.y + end.y) / 2;
                  textAnchor = "start";
                }

                return (
                  <g key={`${edge.from}-${edge.to}-${index}`} className="edge-group">
                    <path d={pathD} fill="none" stroke="transparent" strokeWidth={10} style={{ pointerEvents: "stroke" }} />
                    <path
                      d={pathD} fill="none"
                      stroke={isReturn ? "var(--danger-color)" : "var(--text-muted)"}
                      strokeWidth={1.2}
                      strokeDasharray={isReturn ? "4,4" : "none"}
                      markerEnd={`url(#${isReturn ? "arrow-return" : "arrow"})`}
                    />
                    {edge.label && (
                      <text x={labelX} y={labelY}
                        fill={isReturn ? "var(--danger-color)" : "var(--text-secondary)"}
                        fontSize="8.5px" fontWeight="600" textAnchor={textAnchor}
                        style={{ paintOrder: "stroke", stroke: "var(--bg-primary)", strokeWidth: "3px", strokeLinejoin: "round" }}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// SVGベースのひし形（判断分岐）ノード
function DecisionDiamond({ node, lane, isActive }) {
  const SIZE = 56;
  const HALF = SIZE / 2;
  const title = node.title
    .replace("【判断分岐】", "").replace("判断分岐：", "").replace("判断分岐:", "").trim();
  const borderColor = isActive ? "var(--text-primary)" : (lane.color || "#64748b");
  const borderWidth = isActive ? 2 : 1.5;

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible", display: "block", margin: "auto" }}>
      <polygon
        points={`${HALF},1 ${SIZE - 1},${HALF} ${HALF},${SIZE - 1} 1,${HALF}`}
        fill="white"
        stroke={borderColor}
        strokeWidth={borderWidth}
      />
      <foreignObject x={6} y={HALF - 16} width={SIZE - 12} height={32} style={{ overflow: "visible" }}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            textAlign: "center", fontSize: "0.58rem", fontWeight: 700,
            lineHeight: 1.15, color: "var(--text-primary)", wordBreak: "break-all", overflow: "hidden"
          }}
        >
          {title}
        </div>
      </foreignObject>
    </svg>
  );
}
