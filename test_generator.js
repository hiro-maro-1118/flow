import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

const rawCss = fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8');
const rawApp = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
const rawFlowSidebar = fs.readFileSync(path.join(srcDir, 'components', 'FlowSidebar.jsx'), 'utf8');
const rawSwimlaneFlowChart = fs.readFileSync(path.join(srcDir, 'components', 'SwimlaneFlowChart.jsx'), 'utf8');
const rawScreenPreview = fs.readFileSync(path.join(srcDir, 'components', 'ScreenPreview.jsx'), 'utf8');
const rawNodeDetail = fs.readFileSync(path.join(srcDir, 'components', 'NodeDetail.jsx'), 'utf8');

const cleanCode = (code) => {
  if (!code) return "";
  return code
    .replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, '')
    .replace(/export\s+default\s+function/g, 'function')
    .replace(/export\s+default\s+/g, '')
    .trim();
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
  <div id="root"></div>

  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <script type="text/babel">
    const { useState, useRef, useLayoutEffect, useEffect, useCallback } = React;

    ${iconsCode}

    const sampleFlows = [];

    // ダミーのポータブル用変数定義（未定義エラー防止）
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
    ${cleanCode(rawApp)}

    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'test_export.html'), htmlContent);
console.log('test_export.html generated successfully!');
