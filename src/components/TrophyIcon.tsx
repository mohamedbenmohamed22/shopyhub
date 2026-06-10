import { Trophy } from "lucide-react";

interface TrophyIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

export const TrophyIcon = ({ className, size = "md" }: TrophyIconProps) => {
  return (
    <div className={`relative ${className}`}>
      <Trophy className={`${sizeMap[size]} text-primary drop-shadow-sm`} />
    </div>
  );
};
