import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthSuccess() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  useEffect(() => {
    const c = params.get('code');
    if (c) {
      setCode(c);
      login(c);
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', flexDirection: 'column', gap: '24px', padding: '24px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem' }}>🎉</div>
      <h2 style={{ color: '#fff', fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', margin: 0 }}>
        Google Drive Connected!
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        Save this access code — enter it on any device to access your music:
      </p>
      <div style={{
        background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.5)',
        borderRadius: '16px', padding: '20px 40px', fontSize: '2.2rem', letterSpacing: '8px',
        color: '#c084fc', fontWeight: 'bold', userSelect: 'all'
      }}>
        {code}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', maxWidth: 320 }}>
        This code is your key. Store it safely — you won't see it again.
      </p>
      <button
        className="btn-primary"
        style={{ marginTop: 8 }}
        onClick={() => navigate('/')}
      >
        Go to My Music →
      </button>
    </div>
  );
}
