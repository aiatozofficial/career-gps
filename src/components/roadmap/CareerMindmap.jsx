/**
 * CareerMindmap.jsx
 * Core SVG mindmap canvas using D3 for horizontal tree layout + zoom/pan.
 * Renders the lazy-loaded, stage-locked career mindmap tree with curved Bezier connectors.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as d3 from "d3";
import { saveMindmapExpandedNodes, saveMindmapZoom, loadMindmapZoom } from "../../services/localStorageService";
import { SCAFFOLD_COLORS } from "../../data/scaffoldBuilder";

const NODE_W = 160;
const NODE_H = 44;
const NODE_R = 10;
const H_GAP = 95;   // horizontal gap between depth levels
const V_GAP = 24;   // vertical gap between sibling nodes

function getNodeFill(d) {
  const { type, state } = d.data;
  if (type === "root") return "url(#grad-root-anim)";
  if (state === "locked") return "#f8fafc";
  if (state === "completed") return "#f0fdf4"; // light green
  if (state === "in_progress") return "#eff6ff"; // light blue
  
  const base = SCAFFOLD_COLORS[type] || "#6b7280";
  return `${base}0c`; // extremely soft pastel fill
}

function getNodeStroke(d) {
  const { type, state, isSelectionPoint } = d.data;
  if (type === "root") return "#6d28d9";
  if (state === "locked") return "#cbd5e1";
  if (state === "completed") return "#10b981"; // green
  if (state === "in_progress") return "#3b82f6"; // blue
  if (isSelectionPoint) return "#0891b2"; // cyan

  return SCAFFOLD_COLORS[type] || "#6b7280";
}

function getTextColor(d) {
  const { state, type } = d.data;
  if (type === "root") return "#ffffff";
  if (state === "locked") return "#94a3b8"; // muted gray
  if (state === "completed") return "#15803d"; // green
  if (state === "in_progress") return "#1d4ed8"; // blue
  return "#0f172a"; // slate-900
}

function getSubtextColor(d) {
  const { state, type } = d.data;
  if (type === "root") return "#e9d5ff";
  if (state === "locked") return "#cbd5e1";
  if (state === "completed") return "#16a34a"; // green
  if (state === "in_progress") return "#2563eb"; // blue
  return "#475569"; // slate-600
}

function getNodeOpacity(d) {
  return d.data.state === "locked" ? 0.35 : 1.0;
}

export default function CareerMindmap({
  treeData,
  nodeStates,
  expandedNodeIds,
  setExpandedNodeIds,
  onNodeClick,
  onNodeHover,
  onCanvasClick,
  activeNode,
  profile
}) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const zoomTransformRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  const [dimensions, setDimensions] = useState({ w: 800, h: 500 });



  // Track container size
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDimensions({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    obs.observe(el);
    setDimensions({ w: el.clientWidth || 800, h: el.clientHeight || 600 });
    return () => obs.disconnect();
  }, []);

  // Build D3 hierarchy filtering out collapsed branches
  const buildHierarchy = useCallback(() => {
    if (!treeData) return null;
    return d3.hierarchy(treeData, d => {
      if (!d || !d.id) return null;
      const isSelectionWithChoice = (d.type === "selection" || d.id.includes("-select")) &&
        d.children?.length === 1 && d.children[0] && d.children[0].type === "choice-option-selected";
        
      if (d.type === "choice-option-selected" || isSelectionWithChoice) {
        return d.children?.length ? d.children : null;
      }
      if (!expandedNodeIds || typeof expandedNodeIds.has !== "function" || !expandedNodeIds.has(d.id)) {
        return null;
      }
      return d.children?.length ? d.children : null;
    });
  }, [treeData, expandedNodeIds]);

  // Highlight active node and related path
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (svg.empty() || !treeData) return;

    const relatedIds = new Set();
    if (activeNode) {
      const tempRoot = d3.hierarchy(treeData);
      const activeD3Node = tempRoot.descendants().find(n => n.data.id === activeNode.id);
      if (activeD3Node) {
        activeD3Node.ancestors().forEach(n => relatedIds.add(n.data.id));
        activeD3Node.descendants().forEach(n => relatedIds.add(n.data.id));
      }
    }

    // Node opacities
    svg.selectAll(".node")
      .transition().duration(200)
      .attr("opacity", d => {
        if (activeNode) {
          return relatedIds.has(d.data.id) ? 1.0 : 0.15;
        }
        return d.data.state === "locked" ? 0.35 : 1.0;
      });

    // Link colors
    svg.selectAll(".link")
      .transition().duration(200)
      .attr("stroke", d => {
        const color = SCAFFOLD_COLORS[d.target.data.type] || "#6b7280";
        if (activeNode) {
          const isRelated = relatedIds.has(d.target.data.id) && relatedIds.has(d.source.data.id);
          return isRelated ? `${color}cc` : `${color}08`;
        }
        const opacity = d.target.data.state === "locked" ? "12" : "77";
        return `${color}${opacity}`;
      })
      .attr("stroke-width", d => {
        const baseWidth = d.source.depth === 0 ? 2.5 : 1.5;
        if (activeNode) {
          const isRelated = relatedIds.has(d.target.data.id) && relatedIds.has(d.source.data.id);
          return isRelated ? baseWidth + 1.2 : baseWidth;
        }
        return d.target.data.state === "locked" ? baseWidth : baseWidth + 0.5;
      });

    // Link flow opacity
    svg.selectAll(".link-flow")
      .transition().duration(200)
      .attr("opacity", d => {
        if (activeNode) {
          const isRelated = relatedIds.has(d.target.data.id) && relatedIds.has(d.source.data.id);
          return isRelated ? 1.0 : 0.05;
        }
        return 1.0;
      });
  }, [activeNode, treeData]);

  // Main render effect
  useEffect(() => {
    if (!svgRef.current || !treeData) return;

    const hasRendered = sessionStorage.getItem("career-gps:mindmap-rendered") === "true";

    const { w, h } = dimensions;
    const root = buildHierarchy();
    if (!root) return;

    // D3 horizontal tree layout
    const treeLayout = d3.tree()
      .nodeSize([NODE_H + V_GAP, NODE_W + H_GAP])
      .separation((a, b) => a.parent === b.parent ? 1.2 : 1.8);

    treeLayout(root);

    // Swap x and y coordinates for left-to-right tree
    root.each(d => {
      const tmp = d.x;
      d.x = d.y;
      d.y = tmp;
    });

    // Compute bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    root.each(d => {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    });

    const svg = d3.select(svgRef.current);
    if (svgRef.current && !isFirstRenderRef.current) {
      try {
        zoomTransformRef.current = d3.zoomTransform(svgRef.current);
      } catch (e) {}
    }
    svg.selectAll("*").remove();
    svg.attr("width", "100%").attr("height", "100%")
       .attr("viewBox", `0 0 ${w} ${h}`);

    const defs = svg.append("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    filter.append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 1.5)
      .attr("stdDeviation", 3)
      .attr("flood-color", "#000000")
      .attr("flood-opacity", 0.08);

    // Completion glow filter
    const filterGreen = defs.append("filter").attr("id", "glow-green").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    filterGreen.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur2");
    const feMerge2 = filterGreen.append("feMerge");
    feMerge2.append("feMergeNode").attr("in", "blur2");
    feMerge2.append("feMergeNode").attr("in", "SourceGraphic");

    // Dot grid background pattern
    const patternId = "dot-grid";
    const pat = defs.append("pattern")
      .attr("id", patternId)
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 28).attr("height", 28);
    pat.append("circle").attr("cx", 1).attr("cy", 1).attr("r", 0.8)
       .attr("fill", "rgba(0,0,0,0.06)");

    // Animated gradient for root node
    const rootGrad = defs.append("linearGradient")
      .attr("id", "grad-root-anim")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
    rootGrad.append("stop").attr("offset", "0%").attr("stop-color", "#7c3aed"); // violet-600
    rootGrad.append("stop").attr("offset", "100%").attr("stop-color", "#2563eb"); // blue-600

    // Type gradients
    Object.entries(SCAFFOLD_COLORS).forEach(([type, color]) => {
      const grad = defs.append("linearGradient")
        .attr("id", `grad-${type}`)
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.12);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0.04);
    });

    // White Background
    const bgRect = svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "#ffffff");
    const gridRect = svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", `url(#${patternId})`);

    bgRect.on("click", () => onCanvasClick?.());
    gridRect.on("click", () => onCanvasClick?.());

    // Zoomable group
    const g = svg.append("g")
      .attr("transform", `translate(${60 - minX}, ${40 - minY})`);

    const zoom = d3.zoom()
      .scaleExtent([0.3, 2.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        zoomTransformRef.current = event.transform;
        saveMindmapZoom({ k: event.transform.k, x: event.transform.x, y: event.transform.y });
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Restore zoom transform
    if (zoomTransformRef.current && !isFirstRenderRef.current) {
      svg.call(zoom.transform, zoomTransformRef.current);
    } else {
      const savedZoom = loadMindmapZoom();
      if (savedZoom) {
        const restored = d3.zoomIdentity.translate(savedZoom.x, savedZoom.y).scale(savedZoom.k);
        svg.call(zoom.transform, restored);
        zoomTransformRef.current = restored;
      } else {
        const initialTransform = d3.zoomIdentity.translate(80 - minX, h / 2 - (minY + maxY) / 2);
        svg.call(zoom.transform, initialTransform);
        zoomTransformRef.current = initialTransform;
      }
    }
    isFirstRenderRef.current = false;

    // Curved Bezier connectors (Static base links)
    const linkPath = g.selectAll(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", d => {
        const color = SCAFFOLD_COLORS[d.target.data.type] || "#6b7280";
        const opacity = d.target.data.state === "locked" ? "15" : "77";
        return `${color}${opacity}`;
      })
      .attr("stroke-width", d => {
        const baseWidth = d.source.depth === 0 ? 2.5 : 1.5;
        return d.target.data.state === "locked" ? baseWidth : baseWidth + 0.5;
      })
      .attr("stroke-dasharray", d => d.target.data.type === "alternate" ? "5,4" : null)
      .attr("d", d => {
        const sx = d.source.x + NODE_W;
        const sy = d.source.y + NODE_H / 2;
        const tx = d.target.x;
        const ty = d.target.y + NODE_H / 2;
        const midX = (sx + tx) / 2;
        return `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
      });

    // Unlocked links flow overlays (for visual energy flow)
    const activeLinks = root.links().filter(d => d.target.data.state !== "locked");
    const linkFlowPath = g.selectAll(".link-flow")
      .data(activeLinks)
      .join("path")
      .attr("class", "link-flow")
      .attr("fill", "none")
      .attr("stroke", d => {
        if (d.target.data.isCheckpoint || d.target.data.type === "checkpoint") return "#fbbf24";
        if (d.target.data.state === "completed") return "#10b981";
        return "#7c3aed";
      })
      .attr("stroke-width", d => d.source.depth === 0 ? 3.0 : 2.0)
      .attr("stroke-opacity", 0.35)
      .attr("stroke-dasharray", "6, 12")
      .attr("d", d => {
        const sx = d.source.x + NODE_W;
        const sy = d.source.y + NODE_H / 2;
        const tx = d.target.x;
        const ty = d.target.y + NODE_H / 2;
        const midX = (sx + tx) / 2;
        return `M${sx},${sy} C${midX},${sy} ${midX},${ty} ${tx},${ty}`;
      });

    if (hasRendered) {
      linkPath.attr("opacity", 1);
      linkFlowPath.attr("opacity", 1);
    } else {
      linkPath.attr("opacity", 0)
        .transition().duration(600).delay((d, i) => i * 12)
        .attr("opacity", 1);
      
      linkFlowPath.attr("opacity", 0)
        .transition().duration(600).delay((d, i) => i * 12)
        .attr("opacity", 1);
    }

    // Node groups
    const nodeG = g.selectAll(".node")
      .data(root.descendants())
      .join("g")
      .attr("class", d => `node ${d.data.state === "in_progress" ? "node-pulse" : ""}`)
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .attr("cursor", d => d.data.state === "locked" ? "not-allowed" : "pointer")
      .on("mousedown", (event) => event.stopPropagation())
      .on("click", (event, d) => {
        event.stopPropagation();
        
        // Expand/collapse child branches if node has them
        if (d.data.children && d.data.children.length > 0) {
          setExpandedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(d.data.id)) {
              // Collapse recursively
              const toRemove = [];
              function collectDescendants(n) {
                toRemove.push(n.id);
                if (n.children) n.children.forEach(collectDescendants);
              }
              collectDescendants(d.data);
              toRemove.forEach(id => next.delete(id));
            } else {
              // Expand
              next.add(d.data.id);
            }
            return next;
          });
        }
        onNodeClick?.(d.data);
      });

    if (hasRendered) {
      nodeG.attr("opacity", d => getNodeOpacity(d));
    } else {
      nodeG.attr("opacity", 0)
        .transition().duration(500).delay((d, i) => i * 15)
        .attr("opacity", d => getNodeOpacity(d));
    }

    // Node background rect
    nodeG.append("rect")
      .attr("width", d => d.data.type === "root" ? NODE_W + 20 : NODE_W)
      .attr("height", NODE_H)
      .attr("x", d => d.data.type === "root" ? -10 : 0)
      .attr("rx", d => d.data.type === "root" ? 14 : NODE_R)
      .attr("ry", d => d.data.type === "root" ? 14 : NODE_R)
      .attr("fill", getNodeFill)
      .attr("stroke", getNodeStroke)
      .attr("stroke-width", d => d.data.type === "root" ? 2.5 : d.data.state === "completed" ? 2 : 1.5)
      .attr("filter", d => d.data.state === "completed" ? "url(#glow-green)" : "url(#glow)")
      .on("mouseenter", function(event, d) {
        if (d.data.state !== "locked") {
          onNodeHover(d.data);
          const color = SCAFFOLD_COLORS[d.data.type] || "#6b7280";
          
          // Select the entire parent group and scale/translate it slightly
          d3.select(this.parentNode)
            .raise() // Bring to front
            .transition().duration(150)
            .attr("transform", `translate(${d.x - 3}, ${d.y - 2}) scale(1.04)`);

          d3.select(this)
            .transition().duration(150)
            .attr("stroke-width", 2.5)
            .attr("stroke", color);
        }
      })
      .on("mouseleave", function(event, d) {
        if (d.data.state !== "locked") {
          // Reset parent group scale and position
          d3.select(this.parentNode)
            .transition().duration(150)
            .attr("transform", `translate(${d.x}, ${d.y}) scale(1.0)`);

          d3.select(this)
            .transition().duration(150)
            .attr("stroke-width", d.data.type === "root" ? 2.5 : d.data.state === "completed" ? 2 : 1.5)
            .attr("stroke", getNodeStroke(d))
            .attr("fill", getNodeFill(d));
        }
      });

    // Type indicator dot
    nodeG.append("circle")
      .attr("cx", 16)
      .attr("cy", NODE_H / 2)
      .attr("r", 4)
      .attr("fill", d => {
        if (d.data.state === "completed") return "#10b981";
        return SCAFFOLD_COLORS[d.data.type] || "#6b7280";
      })
      .style("pointer-events", "none");

    // Checkmark for completed nodes
    nodeG.filter(d => d.data.state === "completed")
      .append("text")
      .attr("x", NODE_W - 18)
      .attr("y", NODE_H / 2 + 1)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", "bold")
      .attr("fill", "#10b981")
      .text("✓")
      .style("pointer-events", "none");

    // Primary label
    nodeG.append("text")
      .attr("x", 28)
      .attr("y", NODE_H / 2 - 4)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "'Outfit', sans-serif")
      .attr("font-size", d => d.data.type === "root" ? 12 : 11)
      .attr("font-weight", d => ["root", "goal", "checkpoint"].includes(d.data.type) ? 700 : 600)
      .attr("fill", getTextColor)
      .text(d => {
        const lbl = d.data.label;
        const maxChars = ["root", "choice-option", "choice-option-selected", "selection"].includes(d.data.type) ? 28 : 18;
        return lbl.length > maxChars ? lbl.slice(0, maxChars - 1) + "…" : lbl;
      })
      .style("pointer-events", "none");

    // Timeframe sub-label
    nodeG.filter(d => d.data.timeframe && d.data.type !== "root")
      .append("text")
      .attr("x", 28)
      .attr("y", NODE_H / 2 + 9)
      .attr("dominant-baseline", "middle")
      .attr("font-family", "sans-serif")
      .attr("font-size", 9)
      .attr("font-weight", 400)
      .attr("fill", getSubtextColor)
      .text(d => {
        const t = d.data.timeframe;
        return t.length > 20 ? t.slice(0, 18) + "…" : t;
      })
      .style("pointer-events", "none");

    // Expand/collapse toggle plus/minus button
    const toggleG = nodeG.filter(d => d.data.children && d.data.children.length > 0)
      .append("g")
      .attr("class", "toggle-button")
      .attr("transform", d => {
        const xPos = d.data.type === "root" ? NODE_W + 10 : NODE_W;
        return `translate(${xPos}, ${NODE_H / 2})`;
      });

    toggleG.append("circle")
      .attr("r", 7)
      .attr("fill", "#ffffff")
      .attr("stroke", getNodeStroke)
      .attr("stroke-width", 1.5);

    toggleG.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", 9)
      .attr("font-weight", "bold")
      .attr("fill", "#475569")
      .text(d => expandedNodeIds.has(d.data.id) ? "-" : "+");
    
    isFirstRenderRef.current = false;
    sessionStorage.setItem("career-gps:mindmap-rendered", "true");

  }, [treeData, dimensions, nodeStates, buildHierarchy, onNodeClick, expandedNodeIds, onNodeHover, onCanvasClick]);

  return (
    <div style={{ width: "100%", height: "100%", relative: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          userSelect: "none",
        }}
      />
      <style>{`
        @keyframes pulse-stroke {
          0% { stroke-width: 1.5px; opacity: 1; }
          50% { stroke-width: 3px; opacity: 0.85; }
          100% { stroke-width: 1.5px; opacity: 1; }
        }
        @keyframes flow-dash {
          to { stroke-dashoffset: -18; }
        }
        .node-pulse rect {
          animation: pulse-stroke 2s infinite ease-in-out;
        }
        .link-flow {
          animation: flow-dash 1.0s linear infinite;
        }
      `}</style>
    </div>
  );
}
