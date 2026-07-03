import { usePlayer } from '../context/PlayerContext';
import './Player.css';

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function Player() {
  const { current, isPlaying, shuffle, progress, duration, volume,
    togglePlay, playNext, playPrev, seek, setShuffle, setVolume } = usePlayer();

  if (!current) return null;

  return (
    <div className={`player ${isPlaying ? 'is-playing' : ''}`}>
      <div className="player-song">
        <div className="player-disc"><span /></div>
        <div className="player-meta">
          <p className="player-title">{current.title}</p>
          <p className="player-subtitle">Now playing</p>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`player-btn ${shuffle ? 'active' : ''}`}
            onClick={() => setShuffle(s => !s)}
            title="Shuffle"
          >SH</button>
          <button className="player-btn" onClick={playPrev} title="Previous">PR</button>
          <button className="player-btn play-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? 'II' : '▶'}
          </button>
          <button className="player-btn" onClick={playNext} title="Next">NX</button>
        </div>
        <div className="player-seek">
          <span className="player-time">{fmt(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={e => seek(Number(e.target.value))}
            className="seek-bar"
          />
          <span className="player-time">{fmt(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <span className="vol-icon">VOL</span>
        <input
          type="range"
          min={0}
          max={3}
          step={0.05}
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="vol-bar"
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
      </div>
    </div>
  );
}
