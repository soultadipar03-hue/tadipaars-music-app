import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { getStreamUrl } from '../api';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  // Bumped every time we want to force a new load (handles same-index replays)
  const [loadToken, setLoadToken] = useState(0);

  // Single audio element — created once, never recreated
  const audioRef = useRef(null);
  if (!audioRef.current) {
    const a = new Audio();
    a.preload = 'auto';
    audioRef.current = a;
  }

  // Whether we want the audio to auto-play after the next load
  const shouldPlayRef = useRef(false);

  // Refs that always hold the latest queue/index without causing extra effects
  const queueRef = useRef(queue);
  const indexRef = useRef(currentIndex);
  const shuffleRef = useRef(shuffle);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  const current = queue[currentIndex] || null;

  // ─── Load & play whenever the target song changes ─────────────────────────
  useEffect(() => {
    if (!current) return;
    const audio = audioRef.current;
    setProgress(0);
    setDuration(0);
    audio.src = getStreamUrl(current.id);
    audio.load();
    if (shouldPlayRef.current) {
      // play() returns a Promise; wait for it so we handle AbortError gracefully
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // AbortError is fine (happens if load() interrupts a play — should not
          // occur here since we never double-load). Other errors are real.
          if (err.name !== 'AbortError') console.error('play error:', err);
        });
      }
    }
  // loadToken forces this effect even when currentIndex + queue ref stay the same
  }, [currentIndex, queue, loadToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync React state from browser audio events ───────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    const onTime  = () => setProgress(audio.currentTime);
    const onMeta  = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const q   = queueRef.current;
      const idx = indexRef.current;
      if (q.length === 0) return;
      const next = shuffleRef.current
        ? Math.floor(Math.random() * q.length)
        : (idx + 1) % q.length;
      shouldPlayRef.current = true;
      setCurrentIndex(next);
      setLoadToken(t => t + 1);
    };

    audio.addEventListener('timeupdate',     onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);
    return () => {
      audio.removeEventListener('timeupdate',     onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
    };
  }, []); // runs once — uses refs for latest values

  // ─── Volume ───────────────────────────────────────────────────────────────
  useEffect(() => { audioRef.current.volume = volume; }, [volume]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Start playing a list of songs at a given index.
   * All audio work is handled by the useEffect above — we just set state.
   */
  const playSongs = useCallback((songs, startIndex = 0) => {
    shouldPlayRef.current = true;
    setQueue(songs);
    setCurrentIndex(startIndex);
    // Always bump the token so the effect fires even if index+queue are "same"
    setLoadToken(t => t + 1);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio.paused) {
      shouldPlayRef.current = true;
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    } else {
      shouldPlayRef.current = false;
      audio.pause();
    }
  }, []);

  const playNext = useCallback(() => {
    const q   = queueRef.current;
    const idx = indexRef.current;
    if (q.length === 0) return;
    const next = shuffleRef.current
      ? Math.floor(Math.random() * q.length)
      : (idx + 1) % q.length;
    shouldPlayRef.current = true;
    setCurrentIndex(next);
    setLoadToken(t => t + 1);
  }, []);

  const playPrev = useCallback(() => {
    const q   = queueRef.current;
    const idx = indexRef.current;
    if (q.length === 0) return;
    const prev = (idx - 1 + q.length) % q.length;
    shouldPlayRef.current = true;
    setCurrentIndex(prev);
    setLoadToken(t => t + 1);
  }, []);

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  }, []);

  return (
    <PlayerContext.Provider value={{
      current, queue, isPlaying, shuffle, progress, duration, volume,
      playSongs, togglePlay, playNext, playPrev, seek,
      setShuffle, setVolume,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
