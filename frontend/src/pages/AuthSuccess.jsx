import { useNavigate } from 'react-router-dom';

export default function AuthSuccess() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: '2.5rem' }}>✅</div>

      <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
        Google Drive Connected!
      </h2>

      <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.88rem' }}>
        Enter your access code to continue:
      </p>

      {/* Show the fixed password */}
      <div style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '14px 40px',
        fontSize: '1.8rem',
        letterSpacing: '6px',
        color: '#fff',
        fontWeight: 800,
        userSelect: 'all',
      }}>
        moveon
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', maxWidth: 280, margin: 0 }}>
        This is your permanent password — use it every time you log in.
      </p>

      {/* Send them to login page to type the code */}
      <button
        onClick={() => navigate('/login')}
        style={{
          marginTop: 8,
          height: 42,
          padding: '0 28px',
          border: 0,
          borderRadius: 21,
          background: '#fff',
          color: '#0d0d0f',
          fontSize: '0.88rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Enter Access Code →
      </button>
    </div>
  );
}
