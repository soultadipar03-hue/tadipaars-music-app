import { useEffect } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash">
      <div className="splash-inner">
        <div className="splash-vinyl">
          <div className="vinyl-ring" />
          <div className="vinyl-center" />
        </div>
        <h1 className="splash-title">Tadipaar's</h1>
        <p className="splash-sub">Your personal music universe</p>
      </div>
    </div>
  );
}
