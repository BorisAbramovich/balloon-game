import React from "react";
import { motion } from "framer-motion";

interface BalloonProps {
  activity: { id: string; title: string; color: string; content: string };
  radius: number;
  isSelected: boolean;
  onClick: () => void;
  isCompleted: boolean;
  x: number;
  y: number;
}

export const Balloon: React.FC<BalloonProps> = ({
  activity,
  radius,
  isSelected,
  onClick,
  isCompleted,
  x,
  y,
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      className="absolute flex items-center justify-center cursor-pointer select-none"
      style={{
        width: radius * 2,
        height: radius * 2,
        x,
        y,
        zIndex: isSelected ? 20 : 10,
        filter: isCompleted ? `blur(2px) grayscale(1)` : "drop-shadow(0 4px 6px rgba(0,0,0,0.1))",
      }}
      animate={{
        scale: isSelected ? 1.1 : (hovered ? 1.05 : 1),
        opacity: isCompleted ? 0 : 1,
      }}
      transition={{
        opacity: { duration: isCompleted ? 0.5 : 0.2 },
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
        if (navigator.vibrate) navigator.vibrate(20);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-full h-full rounded-full shadow-lg relative overflow-hidden"
        style={{ backgroundColor: activity.color }}
      >
        <div className="absolute top-[10%] left-[20%] w-[20%] h-[15%] bg-white/40 rounded-full blur-[1px]" />
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[30%] bg-white/20 rounded-full blur-[2px]" />
      </div>
      {/* String */}
      <div className="absolute -bottom-8 left-1/2 w-[2px] bg-sky-300/50 h-8 origin-top" />
      
      {/* Activity Name — always visible, more prominent on hover/select */}
      <div
        dir="auto"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-center px-2 pointer-events-none drop-shadow-md transition-all leading-tight ${
          (isSelected || hovered) ? "opacity-100 scale-110" : "opacity-90"
        }`}
        style={{ fontSize: radius * 0.25, maxWidth: radius * 1.6 }}
      >
        {activity.title}
      </div>
    </motion.div>
  );
};
