// Spinner.jsx — CSS-driven loading indicator for NeuroVault
// Props:
//   size: "sm" | "" (default) | "lg"
//   center: boolean — wrap in a centering div

export default function Spinner({ size = "", center = false }) {
  const cls = ["spinner", size].filter(Boolean).join(" ");
  if (center) {
    return (
      <div className="spinner-center">
        <div className={cls} role="status" aria-label="Loading" />
      </div>
    );
  }
  return <div className={cls} role="status" aria-label="Loading" />;
}
