import { createContext, useContext, useState, useRef, useEffect } from 'react';
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
  const audioRef = useRef(new Audio());

  const current = queue[currentIndex] || null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!current) return;
    audio.src = getStreamUrl(current.drive_file_id);
    audio.load();
    if (isPlaying) audio.play().catch(console.error);
  }, [currentIndex, queue]);

  useEffect(() => {
    const audio = audioRef.current;
    const onTime = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => playNext();
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue, currentIndex, shuffle]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  const playSongs = (songs, startIndex = 0) => {
    setQueue(songs);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    const audio = audioRef.current;
    audio.src = getStreamUrl(songs[startIndex].drive_file_id);
    audio.load();
    audio.play().catch(console.error);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(console.error); setIsPlaying(true); }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    let next;
    if (shuffle) next = Math.floor(Math.random() * queue.length);
    else next = (currentIndex + 1) % queue.length;
    setCurrentIndex(next);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (queue.length === 0) return;
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
  };

  const seek = (time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  };

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
