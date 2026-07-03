import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyCode } from '../api';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await verifyCode(trimmed);
      login(trimmed);
      navigate('/');
    } catch {
      setError('Wrong password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        Enter your access code to continue
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <input
          type="password"
          placeholder="Enter password"
          value={code}
          onChange={e => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          style={{
            height: '48px',
            padding: '0 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.07)',
            color: '#fff',
            fontSize: '1rem',
            outline: 'none',
            textAlign: 'center',
            letterSpacing: '4px',
          }}
        />
        {error && (
          <p style={{ margin: 0, color: '#f87171', fontSize: '0.82rem' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            height: '42px',
            border: 0,
            borderRadius: '21px',
            background: '#fff',
            color: '#0d0d0f',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Verifying...' : 'Enter App →'}
        </button>
      </form>
    </div>
  );
}
