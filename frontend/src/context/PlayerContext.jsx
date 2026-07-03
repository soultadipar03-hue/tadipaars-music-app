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
  const [loadToken, setLoadToken] = useState(0);
  // Bumped every time we want to force a new load (handles same-index replays)

  // Single audio element — created once, never recreated
  const audioRef = useRef(null);
  const gainRef = useRef(null);
  const audioCtxRef = useRef(null);

  if (!audioRef.current) {
    const a = new Audio();
    a.preload = 'auto';
    a.crossOrigin = 'anonymous'; // required for Web Audio API
    audioRef.current = a;
  }

  // Set up Web Audio API gain node for volume boost beyond 1.0
  const getGainNode = () => {
    if (gainRef.current) return gainRef.current;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      source.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      gainRef.current = gain;
      return gain;
    } catch {
      return null;
    }
  };

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

    const onCanPlay = () => {
      if (shouldPlayRef.current) {
        audio.play().catch((err) => {
          if (err.name !== 'AbortError') console.error('play error:', err);
        });
      }
    };

    const onError = () => {
      const err = audio.error;
      console.error('Audio load error:', err?.code, err?.message, '| src:', audio.src);
    };

    audio.removeEventListener('canplay', onCanPlay);
    audio.removeEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });

    const streamUrl = getStreamUrl(current.id);
    console.log('[Player] Loading song:', current.title, '| url:', streamUrl);
    audio.src = streamUrl;
    audio.load();

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

  // ─── Volume (uses GainNode for boost beyond 1.0) ─────────────────────────
  useEffect(() => {
    const gain = getGainNode();
    if (gain) {
      gain.gain.value = volume; // 0–3 range via slider
    } else {
      // Fallback if Web Audio API unavailable
      audioRef.current.volume = Math.min(volume, 1);
    }
  }, [volume]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  /**
   * Start playing a list of songs at a given index.
   * shouldPlayRef is set BEFORE state updates so the load effect sees it as true.
   */
  const playSongs = useCallback((songs, startIndex = 0) => {
    shouldPlayRef.current = true;
    // Flush both queue + index atomically then bump token to guarantee effect fires
    setQueue(songs);
    setCurrentIndex(startIndex);
    setLoadToken(t => t + 1);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
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

  // Stop playback and clear the player completely
  const clearPlayer = useCallback(() => {
    const audio = audioRef.current;
    shouldPlayRef.current = false;
    audio.pause();
    audio.src = '';
    setQueue([]);
    setCurrentIndex(0);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  return (
    <PlayerContext.Provider value={{
      current, queue, isPlaying, shuffle, progress, duration, volume,
      playSongs, togglePlay, playNext, playPrev, seek, clearPlayer,
      setShuffle, setVolume,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
