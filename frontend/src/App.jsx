import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import SplashScreen from './pages/SplashScreen';
import AuthPage from './pages/AuthPage';
import AuthSuccess from './pages/AuthSuccess';
import Home from './pages/Home';
import AlbumPage from './pages/AlbumPage';
import Player from './components/Player';

function AppRoutes() {
  const { accessCode, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />;
  return (
    <>
      <Routes>
        <Route path="/auth/success" element={<AuthSuccess />} />
        {!accessCode ? (
          <>
            <Route path="/login" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      {accessCode && <Player />}
    </>
  );
}


export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
          <AppRoutes />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
