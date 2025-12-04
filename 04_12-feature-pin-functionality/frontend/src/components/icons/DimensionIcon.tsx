interface DimensionIconProps {
  className?: string;
}

export const DimensionIcon = ({ className = "w-5 h-5" }: DimensionIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Główna linia pozioma */}
      <line x1="3" y1="15" x2="21" y2="15" />
      
      {/* Pionowe kreski na końcach (tick marks) - dłuższe */}
      <line x1="3" y1="11" x2="3" y2="19" />
      <line x1="21" y1="11" x2="21" y2="19" />
      
      {/* Strzałka w lewo - większa */}
      <polyline points="7,15 3,15 7,11" />
      <polyline points="7,15 3,15 7,19" />
      
      {/* Strzałka w prawo - większa */}
      <polyline points="17,15 21,15 17,11" />
      <polyline points="17,15 21,15 17,19" />
      
      {/* Litera X nad strzałkami - większa */}
      <text
        x="12"
        y="9"
        fontSize="10"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontWeight="bold"
      >
        X
      </text>
    </svg>
  );
};

export default DimensionIcon;

