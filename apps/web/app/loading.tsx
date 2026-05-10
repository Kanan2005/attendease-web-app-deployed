export default function RootLoading() {
  return (
    <div className="ae-splash" role="status" aria-label="Loading AttendEase">
      {/* Decorative gradient orbs */}
      <div className="ae-splash-orb ae-splash-orb--tl" />
      <div className="ae-splash-orb ae-splash-orb--br" />

      {/* Logo with glow ring */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ae-splash-glow" />
        <img src="/logo.png" alt="AttendEase" width={72} height={72} className="ae-splash-logo" />
      </div>

      {/* Title */}
      <div className="ae-splash-title">AttendEase</div>

      {/* Tagline */}
      <div className="ae-splash-tagline">
        Smart attendance for classrooms
      </div>

      {/* Loading dots */}
      <div className="ae-splash-dots">
        <div className="ae-splash-dot" />
        <div className="ae-splash-dot" />
        <div className="ae-splash-dot" />
      </div>

      {/* Footer branding */}
      <div className="ae-splash-footer">MNIT Jaipur</div>
    </div>
  )
}
