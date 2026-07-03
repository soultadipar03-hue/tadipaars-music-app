import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthSuccess() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const c = params.get('code');
    if (c) {
      login(c);
    }
    navigate('/', { replace: true });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0f', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem'
    }}>
      Connecting…
    </div>
  );
}
