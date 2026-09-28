"use client";

import React, { useId } from "react";
import { motion } from "motion/react";

interface MiniSparklineProps {
  data: number[];
  color?: string;
  fillOpacity?: number;
  height?: number;
  width?: number | string;
  positive?: boolean;
}

export function MiniSparkline({
  data,
  color = "#6366f1",
  fillOpacity = 0.18,
  height = 36,
  width = "100%",
  positive,
}: MiniSparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const svgWidth = 120;
  const svgHeight = height;
  const paddingY = 4;
  const chartHeight = svgHeight - paddingY * 2;

  // Calculate points
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * svgWidth;
    const y = svgHeight - paddingY - ((val - min) / range) * chartHeight;
    return { x, y };
  });

  // Generate smooth SVG curve path (Catmull-Rom or cubic Bezier)
  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, "");

  // Area path closing at the bottom
  const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  const strokeColor =
    positive === true ? "#10b981" : positive === false ? "#f43f5e" : color;

  return (
    <div className="relative overflow-hidden" style={{ width, height: svgHeight }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <motion.path
          d={areaD}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {/* Animated Stroke Line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Highlight Dot on Last Point */}
        {points.length > 0 && (
          <motion.circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={3}
            fill={strokeColor}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.7, duration: 0.3 }}
          />
        )}
      </svg>
    </div>
  );
}
