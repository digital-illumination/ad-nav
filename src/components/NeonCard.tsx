interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

export default function NeonCard({
  children,
  className = "",
  animated = false,
}: NeonCardProps) {
  if (animated) {
    return (
      <div className={`animated-border p-6 ${className}`}>
        <div className="relative z-10">{children}</div>
      </div>
    );
  }

  return (
    <div className={`glass-card neon-border p-6 ${className}`}>{children}</div>
  );
}
