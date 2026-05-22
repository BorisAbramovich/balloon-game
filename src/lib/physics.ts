export const COLORS = [
  "#F87171", // red
  "#FB923C", // orange
  "#FBBF24", // amber
  "#A3E635", // lime
  "#34D399", // emerald
  "#22D3EE", // cyan
  "#60A5FA", // blue
  "#818CF8", // indigo
  "#C084FC", // purple
  "#F472B6", // pink
];

export interface PhysicsPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function getInitialStats(w: number, h: number, radius: number): PhysicsPosition {
  const radiusPadding = radius; // Prevent spawning on edges
  const safeWidth = w - radiusPadding * 2;
  const safeHeight = h - radiusPadding * 2;

  const x = Math.random() * safeWidth + radiusPadding;
  const y = Math.random() * safeHeight + radiusPadding;
  
  const speed = 0.5 + Math.random() * 0.5; // Slow drift speed
  const angle = Math.random() * Math.PI * 2;
  
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
  };
}

// Simple collision detection between two circles
export function checkCollision(a: PhysicsPosition, b: PhysicsPosition) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}
