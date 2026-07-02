import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSongs, uploadSong, deleteSong } from '../api';
import { usePlayer } from '../context/PlayerContext';
import './AlbumPage.css';

export default function AlbumPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { playSongs, current, isPlaying, togglePlay } = usePlayer();
  const album = state?.album || { name: 'Album', id };

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef();

  useEffect(() => {
    getSongs(id).then(setSongs).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const title = file.name.replace(/\.mp3$/i, '');
    setUploading(true);
    setUploadProgress(0);
    try {
      const song = await uploadSong(id, file, title, setUploadProgress);
      setSongs(prev => [...prev, song]);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDelete = async (e, songId) => {
    e.stopPropagation();
    if (!confirm('Delete this song?')) return;
    await deleteSong(songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handlePlay = (index) => {
    const cur = current;
    if (cur && cur.id === songs[index].id) {
      togglePlay();
    } else {
      playSongs(songs, index);
    }
  };

  const formatDuration = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="album-page">
      <div className="album-page-header">
        <button className="btn-ghost back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="album-hero">
          <div className="album-hero-cover">
            <span>🎵</span>
          </div>
          <div className="album-hero-info">
            <p className="album-hero-label">Album</p>
            <h1 className="album-hero-name">{album.name}</h1>
            <p className="album-hero-count">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
            <div className="album-hero-actions">
              {songs.length > 0 && (
                <button className="btn-primary" onClick={() => playSongs(songs, 0)}>
                  ▶ Play All
                </button>
              )}
              <button
                className="btn-outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? `Uploading ${uploadProgress}%` : '+ Upload Song'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".mp3,audio/mpeg"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="upload-bar-wrap">
          <div className="upload-bar" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      <div className="songs-list">
        {loading ? (
          <div className="songs-loading"><div className="spinner" /></div>
        ) : songs.length === 0 ? (
          <div className="songs-empty">
            <span>🎵</span>
            <p>No songs yet — upload your first MP3</p>
            <button className="btn-outline" onClick={() => fileRef.current?.click()}>Upload Song</button>
          </div>
        ) : (
          songs.map((song, i) => {
            const isActive = current?.id === song.id;
            return (
              <div
                key={song.id}
                className={`song-row ${isActive ? 'active' : ''}`}
                onClick={() => handlePlay(i)}
              >
                <div className="song-num">
                  {isActive && isPlaying ? (
                    <span className="song-playing-bars">
                      <span /><span /><span />
                    </span>
                  ) : (
                    <span className="song-num-text">{i + 1}</span>
                  )}
                </div>
                <div className="song-info">
                  <p className="song-title">{song.title}</p>
                </div>
                <span className="song-duration">{formatDuration(song.duration)}</span>
                <button className="song-delete" onClick={e => handleDelete(e, song.id)}>✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
