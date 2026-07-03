import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthSuccess() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const c = params.get('code');
    if (c) login(c);
  }, []);

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
      <div style={{ fontSize: '2.5rem' }}>🎉</div>

      <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
        Google Drive Connected!
      </h2>

      <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: '0.88rem' }}>
        Your universal access password is:
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '16px 40px',
        fontSize: '2rem',
        letterSpacing: '6px',
        color: '#fff',
        fontWeight: 800,
        userSelect: 'all',
      }}>
        moveon
      </div>

      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', maxWidth: 300, margin: 0 }}>
        Use this password anytime to log in — it never changes.
      </p>

      <button
        onClick={() => navigate('/')}
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
        Go to My Music →
      </button>
    </div>
  );
}
