export default function StatCard({ label, value, hint, tone = "default" }) {
  const toneClasses = {
    default: "text-bosque-700",
    warn: "text-amber-700",
    danger: "text-red-700",
  };

  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-bosque-500 mb-1">{label}</p>
      <p className={`font-display text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="text-xs text-bosque-500/80 mt-1">{hint}</p>}
    </div>
  );
}
