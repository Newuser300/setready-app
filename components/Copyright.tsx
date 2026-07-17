export default function Copyright() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '24px 16px 16px',
      borderTop: '1px solid #f3f4f6',
      marginTop: '40px',
    }}>
      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
        © 2026 BGReady. All rights reserved.
        {' '}
        <a href="/terms" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Terms</a>
        {' · '}
        <a href="/privacy" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Privacy</a>
        {' · '}
        <a href="mailto:support@setready.site" style={{ color: '#9ca3af', textDecoration: 'underline' }}>Contact</a>
      </p>
    </div>
  )
}
