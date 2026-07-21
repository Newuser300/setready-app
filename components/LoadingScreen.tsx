export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '14px',
        backgroundColor: '#F59E0B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        fontWeight: '900',
        color: '#1a1a2e',
        fontFamily: 'Arial, sans-serif',
        animation: 'pulse 1.6s ease-in-out infinite',
      }}>
        BG
      </div>
      <div style={{ color: '#9ca3af', fontSize: '14px' }}>Loading...</div>
    </div>
  )
}
