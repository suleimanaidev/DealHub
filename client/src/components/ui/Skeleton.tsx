interface Props {
  className?: string;
  count?: number;
}

export default function Skeleton({ className = '', count = 1 }: Props) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
      ))}
    </div>
  );
}
