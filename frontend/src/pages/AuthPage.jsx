import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGoogleAuthUrl, verifyCode } from '../api';
import './AuthPage.css';

export default function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('choice');

  const handleGoogleConnect = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setError('Failed to start Google auth. Make sure secrets are configured.');
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await verifyCode(trimmed);
      login(trimmed);
      navigate('/');
    } catch {
      setError('Invalid or expired access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">Tadipaar's</h1>
        <p className="auth-tagline">Your personal music universe</p>

        {view === 'choice' && (
          <div className="auth-choices">
            <button className="btn-primary" onClick={() => setView('code')}>
              <span>🔑</span> Enter Access Code
            </button>
            <div className="auth-divider">or</div>
            <button className="btn-outline" onClick={handleGoogleConnect}>
              <span>🔗</span> Connect Google Drive (first time)
            </button>
          </div>
        )}

        {view === 'code' && (
          <form className="code-form" onSubmit={handleCodeSubmit}>
            <label>Enter your access code</label>
            <input
              className="code-input"
              type="text"
              placeholder="TMUS-XXXX"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={9}
              autoFocus
              spellCheck={false}
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Enter App'}
            </button>
            <button className="btn-ghost" type="button" onClick={() => { setView('choice'); setError(''); }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
