import { useRef, useEffect, useState } from 'react';
import type { AudioData } from '../hooks/useAudioAnalyzer';

type VisualizationMode = 'bars' | 'waveform' | 'circles' | 'particles';

interface VisualizerProps {
  audioData: AudioData;
  isActive: boolean;
  mode?: VisualizationMode;
  themeColor?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

export function Visualizer({
  audioData,
  isActive,
  mode = 'bars',
  themeColor = '#6366f1',
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const { clientWidth, clientHeight } = canvasRef.current.parentElement;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Main render loop
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      switch (mode) {
        case 'bars':
          renderBars(ctx, canvas, audioData, themeColor);
          break;
        case 'waveform':
          renderWaveform(ctx, canvas, audioData, themeColor);
          break;
        case 'circles':
          renderCircles(ctx, canvas, audioData, themeColor);
          break;
        case 'particles':
          renderParticles(ctx, canvas, audioData, themeColor, particlesRef.current);
          break;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioData, isActive, mode, themeColor, dimensions]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
    />
  );
}

// Frequency bars visualization
function renderBars(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  audioData: AudioData,
  themeColor: string
) {
  const { frequencies, isBeat } = audioData;
  const barCount = Math.min(32, frequencies.length);
  const barWidth = canvas.width / barCount;
  const maxHeight = canvas.height * 0.6;

  // Parse theme color for gradient
  const rgb = hexToRgb(themeColor) || { r: 99, g: 102, b: 241 };

  for (let i = 0; i < barCount; i++) {
    const value = frequencies[Math.floor(i * frequencies.length / barCount)] / 255;
    const height = value * maxHeight;
    const x = i * barWidth;
    const y = canvas.height - height;

    // Create gradient
    const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
    const alpha = isBeat ? 0.9 : 0.6;
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(x + 1, y, barWidth - 2, height);
  }
}

// Waveform visualization
function renderWaveform(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  audioData: AudioData,
  themeColor: string
) {
  const { waveform, volume } = audioData;
  const rgb = hexToRgb(themeColor) || { r: 99, g: 102, b: 241 };

  ctx.beginPath();
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.5 + volume * 0.4})`;
  ctx.lineWidth = 2 + volume * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sliceWidth = canvas.width / waveform.length;
  let x = 0;

  for (let i = 0; i < waveform.length; i++) {
    const v = waveform[i] / 128.0;
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.stroke();

  // Draw glow effect
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 15;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// Circles visualization
function renderCircles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  audioData: AudioData,
  themeColor: string
) {
  const { bass, mid, high, isBeat } = audioData;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const rgb = hexToRgb(themeColor) || { r: 99, g: 102, b: 241 };

  // Draw expanding circles based on frequency bands
  const circles = [
    { radius: 50 + bass * 100, alpha: 0.3 + bass * 0.4, width: 2 + bass * 4 },
    { radius: 80 + mid * 80, alpha: 0.25 + mid * 0.3, width: 2 + mid * 3 },
    { radius: 110 + high * 60, alpha: 0.2 + high * 0.25, width: 1 + high * 2 },
  ];

  circles.forEach((circle) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, circle.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${circle.alpha})`;
    ctx.lineWidth = circle.width;
    ctx.stroke();
  });

  // Beat flash
  if (isBeat) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 + bass * 50, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
    ctx.fill();
  }
}

// Particles visualization
function renderParticles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  audioData: AudioData,
  themeColor: string,
  particles: Particle[]
) {
  const { bass, volume, isBeat } = audioData;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const rgb = hexToRgb(themeColor) || { r: 99, g: 102, b: 241 };

  // Spawn new particles on beat or when volume is high
  if (isBeat || (volume > 0.5 && Math.random() > 0.7)) {
    const count = isBeat ? 5 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + bass * 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        size: 2 + Math.random() * 4,
        hue: Math.random() * 30 - 15, // Slight hue variation
      });
    }
  }

  // Limit particle count
  while (particles.length > 100) {
    particles.shift();
  }

  // Update and render particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // Update position
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02; // Gravity
    p.life -= 1 / p.maxLife;

    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Render particle
    const alpha = p.life * 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r + p.hue}, ${rgb.g + p.hue}, ${rgb.b}, ${alpha})`;
    ctx.fill();
  }
}

// Helper function
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
