/**
 * "Hurry up and wait" — the truest loading state in film.
 * A background performer waits in a folding chair: sips coffee, checks
 * the time, slumps. Same default export as before; drop-in safe.
 */
export default function LoadingScreen() {
  return (
    <div
      className="bgfx-wait"
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
      }}
    >
      <svg width="120" height="110" viewBox="0 0 120 110" aria-hidden="true">
        {/* folding chair */}
        <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none">
          <line x1="38" y1="62" x2="86" y2="62" />
          <line x1="40" y1="62" x2="30" y2="102" />
          <line x1="84" y1="62" x2="94" y2="102" />
          <line x1="46" y1="62" x2="88" y2="98" />
          <line x1="78" y1="62" x2="36" y2="98" />
          <line x1="40" y1="34" x2="40" y2="62" />
          <rect x="38" y="30" width="6" height="18" rx="2" fill="#F59E0B" stroke="none" />
        </g>
        {/* the performer */}
        <g className="bgfx-slump">
          <g stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" fill="none">
            <circle cx="62" cy="26" r="7" fill="#1a1a2e" />
            <line x1="62" y1="33" x2="60" y2="58" />
            {/* coffee arm */}
            <g className="bgfx-sip">
              <line x1="60" y1="42" x2="76" y2="48" />
              <rect x="75" y="42" width="8" height="9" rx="1.5" fill="#F59E0B" stroke="none" />
            </g>
            {/* watch arm */}
            <g className="bgfx-watch">
              <line x1="60" y1="41" x2="46" y2="50" />
              <circle cx="46" cy="50" r="2.6" fill="#F59E0B" stroke="none" />
            </g>
            {/* legs crossed off the chair */}
            <line x1="60" y1="58" x2="50" y2="80" />
            <line x1="60" y1="58" x2="72" y2="78" />
            <line x1="72" y1="78" x2="70" y2="96" />
            <line x1="50" y1="80" x2="56" y2="96" />
          </g>
        </g>
        {/* BACK OF CHAIR label */}
        <text x="26" y="24" fill="#4b5563" fontSize="7" fontFamily="monospace" transform="rotate(-4 26 24)">BACKGROUND</text>
      </svg>
      <div className="bgfx-wait-dots" style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>
        Hurry up and wait
      </div>
    </div>
  );
}
