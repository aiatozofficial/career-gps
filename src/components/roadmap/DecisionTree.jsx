import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { filterTreeByFinancialTier } from "../../utils/roadmapHelpers";

const nodeColors = {
  decision: "#7dd3fc",
  milestone: "#8fd5c0",
  goal: "#f7d06b",
  alternate: "#f4a38f",
};

const nodeTextColors = {
  decision: "#0369a1",  // sky-700
  milestone: "#047857", // emerald-700
  goal: "#b45309",      // amber-700
  alternate: "#b91c1c", // red-700
};

export default function DecisionTree({
  treeData,
  financialTier,
  completedMilestones,
  onToggleMilestone,
  completedDeepWeeks = [],
  onToggleDeepWeek,
}) {
  const isNodeCompleted = (nodeId) => {
    if (typeof nodeId === "string" && nodeId.startsWith("Week ")) {
      return completedDeepWeeks.includes(nodeId);
    }
    return completedMilestones.has(nodeId);
  };
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [popover, setPopover] = useState(null); // { x, y, data }

  const filteredTree = useMemo(
    () => filterTreeByFinancialTier(treeData, financialTier),
    [treeData, financialTier],
  );

  useEffect(() => {
    if (!svgRef.current || !filteredTree) return;

    const width = 980;
    const height = 620;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("role", "img");

    // Dot grid pattern for light background
    const defs = svg.append("defs");
    const patternId = "decision-dot-grid";
    const pat = defs.append("pattern")
      .attr("id", patternId)
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 24).attr("height", 24);
    pat.append("circle").attr("cx", 1).attr("cy", 1).attr("r", 0.8)
       .attr("fill", "rgba(0,0,0,0.06)");

    // Clean white background rects
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "#ffffff");
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", `url(#${patternId})`);

    const zoomLayer = svg.append("g");
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
        setPopover(null); // Hide popover on pan/zoom
      });

    svg.call(zoom);

    // Initial transform: top-center
    const initialTransform = d3.zoomIdentity.translate(width / 2, 80);
    svg.call(zoom.transform, initialTransform);

    const graph = zoomLayer.append("g");

    const root = d3.hierarchy(filteredTree, (d) => d.children);
    root.x0 = 0;
    root.y0 = 0;

    // Helper: recursively collapse children to start.
    // We keep the top 2 levels expanded initially to show the immediate next steps.
    // If a node is completed, we leave it expanded so it automatically reveals the next goal.
    root.descendants().forEach((d) => {
      const isCompleted = isNodeCompleted(d.data.id);
      const isAlternate = d.data.type === "alternate";

      if (!isCompleted && d.depth >= 2 && d.children) {
        d._children = d.children;
        d.children = null;
      }
      if (isAlternate && !isCompleted && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

    const treeLayout = d3.tree().nodeSize([200, 160]);

    const linkLayer = graph.append("g").attr("fill", "none").attr("stroke", "#cbd5e1").attr("stroke-opacity", 0.75).attr("stroke-width", 1.5);
    const nodeLayer = graph.append("g");

    let nodeIdCounter = 0;

    function update(source) {
      const treeData = treeLayout(root);
      const nodes = treeData.descendants();
      const links = treeData.descendants().slice(1);

      // --- LINKS ---
      const link = linkLayer.selectAll("path.link").data(links, (d) => d.id || (d.id = ++nodeIdCounter));

      const linkEnter = link
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", () => {
          const o = { x: source.x0, y: source.y0 };
          return diagonal(o, o);
        });

      const linkUpdate = linkEnter.merge(link);
      linkUpdate
        .transition()
        .duration(400)
        .attr("d", (d) => diagonal(d.parent, d));

      link
        .exit()
        .transition()
        .duration(400)
        .attr("d", () => {
          const o = { x: source.x, y: source.y };
          return diagonal(o, o);
        })
        .remove();

      // --- NODES ---
      const node = nodeLayer.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++nodeIdCounter));

      const nodeEnter = node
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", () => `translate(${source.x0},${source.y0})`);

      // Node Body (Rect)
      nodeEnter
        .append("rect")
        .attr("x", -85)
        .attr("y", -35)
        .attr("width", 170)
        .attr("height", 70)
        .attr("rx", 8)
        .style("cursor", "pointer")
        .attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#f0fdf4" : (nodeColors[d.data.type] ? `${nodeColors[d.data.type]}0f` : "#f8fafc")))
        .attr("stroke", (d) => (isNodeCompleted(d.data.id) ? "#10b981" : (nodeColors[d.data.type] ?? "#cbd5e1")))
        .attr("stroke-width", 1.5)
        .on("click", (event, d) => {
          event.stopPropagation();
          const rect = containerRef.current.getBoundingClientRect();
          setPopover({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            data: d.data,
          });
        });

      // Status indicator circle inside rect
      nodeEnter
        .append("circle")
        .attr("cx", -70)
        .attr("cy", -20)
        .attr("r", 5)
        .attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#10b981" : (nodeColors[d.data.type] ?? "#cbd5e1")));

      // Month text inside rect
      nodeEnter
        .append("text")
        .attr("class", "node-month")
        .attr("x", -60)
        .attr("y", -17)
        .attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#16a34a" : "#64748b"))
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .text((d) => d.data.month);

      // Label text inside rect (wrapping)
      nodeEnter
        .append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#15803d" : "#0f172a"))
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .style("pointer-events", "none")
        .each(function wrapLabel(d) {
          const text = d3.select(this);
          const words = d.data.label.split(/\s+/);
          let firstLine = words.slice(0, 3).join(" ");
          let secondLine = words.slice(3).join(" ");
          
          // Better wrapping logic if words are long
          if (firstLine.length > 20 && words.length > 2) {
             firstLine = words.slice(0, 2).join(" ");
             secondLine = words.slice(2).join(" ");
          }

          if (!secondLine) {
            text.append("tspan").attr("x", 0).attr("dy", 4).text(firstLine);
          } else {
            text.append("tspan").attr("x", 0).attr("dy", -4).text(firstLine);
            text.append("tspan").attr("x", 0).attr("dy", 16).text(secondLine.length > 22 ? secondLine.slice(0, 20) + "..." : secondLine);
          }
        });

      // Expand/Collapse Toggle Group (only if node has children)
      const toggleG = nodeEnter
        .filter((d) => d._children || d.children)
        .append("g")
        .attr("transform", "translate(0, 35)") // Position at bottom edge of rect
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          event.stopPropagation();
          setPopover(null); // Hide popover on structure change
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        });

      toggleG.append("circle").attr("class", "toggle-circle").attr("r", 9).attr("fill", "#ffffff").attr("stroke", "#cbd5e1").attr("stroke-width", 1.5);
      toggleG
        .append("text")
        .attr("class", "toggle-icon")
        .attr("text-anchor", "middle")
        .attr("dy", 3.5)
        .attr("fill", "#475569")
        .attr("font-size", 11)
        .attr("font-weight", "bold")
        .style("pointer-events", "none")
        .text((d) => (d.children ? "-" : "+"));

      const nodeUpdate = nodeEnter.merge(node);

      nodeUpdate
        .transition()
        .duration(400)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      // Update toggle icon and rect colors in case of re-render
      nodeUpdate.select("rect")
        .attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#f0fdf4" : (nodeColors[d.data.type] ? `${nodeColors[d.data.type]}0f` : "#f8fafc")))
        .attr("stroke", (d) => (isNodeCompleted(d.data.id) ? "#10b981" : (nodeColors[d.data.type] ?? "#cbd5e1")));
      nodeUpdate.select("circle").attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#10b981" : (nodeColors[d.data.type] ?? "#cbd5e1")));
      nodeUpdate.select(".node-label").attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#15803d" : "#0f172a"));
      nodeUpdate.select(".node-month").attr("fill", (d) => (isNodeCompleted(d.data.id) ? "#16a34a" : "#64748b"));
      nodeUpdate.select(".toggle-circle").attr("stroke", (d) => (isNodeCompleted(d.data.id) ? "#10b981" : (nodeColors[d.data.type] ?? "#cbd5e1")));
      nodeUpdate.select(".toggle-icon").text((d) => (d.children ? "-" : "+"));

      const nodeExit = node
        .exit()
        .transition()
        .duration(400)
        .attr("transform", () => `translate(${source.x},${source.y})`)
        .remove();

      nodeExit.select("rect").attr("width", 0).attr("height", 0);

      nodes.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    update(root);

    function diagonal(s, d) {
      return `M ${s.x} ${s.y}
              C ${s.x} ${(s.y + d.y) / 2},
                ${d.x} ${(s.y + d.y) / 2},
                ${d.x} ${d.y}`;
    }

  }, [filteredTree, completedMilestones, completedDeepWeeks]); // Re-run when completion changes so colors update

  if (!filteredTree) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0b111d] p-6 text-sm text-slate-300">
        No decision tree branch is available for this financial view.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-lg border border-slate-200/60 bg-white" ref={containerRef}>
        <svg ref={svgRef} className="h-[620px] w-full" onClick={() => setPopover(null)} />
        
        {/* Floating Popover */}
        {popover && (
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              // Position fixed near the mouse click
            }}
          >
            <div
              className="pointer-events-auto absolute w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-5 shadow-lg"
              style={{ left: popover.x, top: Math.max(20, popover.y - 180) }}
            >
              <button
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                onClick={() => setPopover(null)}
              >
                ✕
              </button>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: nodeTextColors[popover.data.type] || "#047857" }}>
                {popover.data.month} - {popover.data.type}
              </p>
              <h3 className="mt-1 text-lg font-bold text-ink">{popover.data.label}</h3>
              <p className="mt-2 text-sm text-slate-600">{popover.data.detail}</p>
              
              {(popover.data.type === "milestone" || popover.data.type === "goal") && (
                <label
                  onClick={(e) => {
                    e.preventDefault();
                    if (popover.data.id.startsWith("Week ")) {
                      onToggleDeepWeek(popover.data.id);
                    } else {
                      onToggleMilestone(popover.data.id);
                    }
                  }}
                  className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100"
                >
                  <div
                    className={`custom-checkbox shrink-0 ${isNodeCompleted(popover.data.id) ? "checked" : ""}`}
                  >
                    <div className="custom-checkbox-checkmark" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {isNodeCompleted(popover.data.id) ? "Marked complete" : "Mark as complete"}
                  </span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
