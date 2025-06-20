"use client";

import { useRef, useEffect } from 'react';

interface HeatmapCanvasProps {
  data: Array<{ x: number; y: number; value: number }>;
  axisLabels: {
    xAxisMinLabel: string;
    xAxisMaxLabel: string;
    yAxisMinLabel: string;
    yAxisMaxLabel: string;
  };
  width?: number;
  height?: number;
}

export default function HeatmapCanvas({
  data,
  axisLabels,
  width = 600,
  height = 600
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Draw heatmap when data changes
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match props
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    
    // Draw horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = i * (canvas.height / 10);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = i * (canvas.width / 10);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Draw axes
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = '#ff6347'; // Red color for axes
    ctx.lineWidth = 2;
    
    // Horizontal axis
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // Vertical axis
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    
    // Draw heatmap points
    if (data.length === 0) return;
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    data.forEach(point => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      const intensity = point.value / maxValue;
      
      // Calculate radius based on intensity
      const radius = Math.max(5, 20 * intensity);
      
      // Create gradient for the point
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      
      // Set colors based on intensity (red with varying opacity)
      const alpha = Math.min(0.8, 0.2 + (intensity * 0.6));
      gradient.addColorStop(0, `rgba(255, 99, 71, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 99, 71, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Add labels
    ctx.fillStyle = '#202124';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis labels
    ctx.fillText(axisLabels.xAxisMinLabel, 50, centerY - 10);
    ctx.fillText(axisLabels.xAxisMaxLabel, canvas.width - 50, centerY - 10);
    
    // Y-axis labels
    ctx.fillText(axisLabels.yAxisMaxLabel, centerX + 10, 20);
    ctx.fillText(axisLabels.yAxisMinLabel, centerX + 10, canvas.height - 10);
    
  }, [data, axisLabels, width, height]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height}
      style={{ width: '100%', height: '100%' }}
    />
  );
}