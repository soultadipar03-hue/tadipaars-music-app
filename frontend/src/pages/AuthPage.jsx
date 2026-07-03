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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleConnect = async () => {
    setGoogleLoading(true);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setError('Failed to start Google auth.');
      setGoogleLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
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
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">Tadipaar's</h1>
        <p className="auth-tagline">Your personal music universe</p>

        {/* Password input — always visible */}
        <form className="code-form" onSubmit={handleCodeSubmit}>
          <input
            className="code-input"
            type="password"
            placeholder="Enter password"
            value={code}
            onChange={e => setCode(e.target.value)}
            autoFocus
            spellCheck={false}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Enter App'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        {/* Google Drive — first time setup */}
        <button
          className="btn-outline"
          onClick={handleGoogleConnect}
          disabled={googleLoading}
        >
          <span>🔗</span> {googleLoading ? 'Redirecting...' : 'Connect Google Drive'}
        </button>
      </div>
    </div>
  );
}
