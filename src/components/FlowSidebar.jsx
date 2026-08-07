import React from "react";
import { Workflow } from "lucide-react";

export default function FlowSidebar({
  flows,
  activeFlowId,
  onSelectFlow
}) {
  return (
    <div className="left-pane">
      <div className="pane-header">
        <span>業務フロー一覧</span>
        <Workflow size={16} />
      </div>

      <div className="flow-list-container">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className={`flow-item ${flow.id === activeFlowId ? "active" : ""}`}
            onClick={() => onSelectFlow(flow.id)}
          >
            <div className="flow-item-title">
              {flow.title}
            </div>
            <div className="flow-item-desc">{flow.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
