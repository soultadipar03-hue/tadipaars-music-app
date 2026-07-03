import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSongs, uploadSong, deleteSong, getAlbums } from '../api';
import { usePlayer } from '../context/PlayerContext';
import './Home.css';
import './AlbumPage.css';

export default function AlbumPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { playSongs, current, isPlaying, togglePlay, setShuffle } = usePlayer();
  const album = state?.album || { name: 'Album', id };

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allAlbums, setAllAlbums] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    getSongs(id).then(setSongs).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getAlbums().then(setAllAlbums).catch(console.error);
  }, []);

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

  const handleShuffle = () => {
    if (songs.length === 0) return;
    const startIndex = Math.floor(Math.random() * songs.length);
    setShuffle(true);
    playSongs(songs, startIndex);
  };

  const formatDuration = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const Sidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">Discover</p>
        <button className="sidebar-item" onClick={() => navigate('/')}><span className="sidebar-icon">H</span> Home</button>
      </div>
      <div className="sidebar-section">
        <p className="sidebar-label">Playlists</p>
        {allAlbums.map(a => (
          <button
            key={a.id}
            className={`sidebar-item ${a.id === id ? 'active' : 'dim'}`}
            onClick={() => a.id !== id && navigate(`/album/${a.id}`, { state: { album: a } })}
          >
            <span className="sidebar-icon">P</span> {a.name}
          </button>
        ))}
      </div>
      <div className="sidebar-profile">
        <span className="profile-dot">T</span>
        <span>Tadipaar's</span>
      </div>
    </aside>
  );

  return (
    <div className="album-page">
      <div className="music-shell">
        <Sidebar />
        <main className="album-main">
          <header className="album-topbar">
            <p className="album-breadcrumb">Library / {album.name}</p>
            <div className="album-topbar-actions">
              <button className="btn-ghost" onClick={() => navigate('/')}>Back</button>
              <div className="search-pill"><span>Search</span><span>Find in playlist</span></div>
            </div>
          </header>

          <section className="album-hero">
            <div className="album-hero-cover">
              <span className="album-cover-title">{album.name}</span>
            </div>
            <div className="album-hero-info">
              <p className="album-hero-label">Album</p>
              <h1 className="album-hero-name">{album.name}</h1>
              <p className="album-hero-count">{songs.length} song{songs.length !== 1 ? 's' : ''} in this playlist</p>
              <div className="album-hero-actions">
                {songs.length > 0 && (
                  <>
                    <button className="btn-primary" onClick={() => playSongs(songs, 0)}>Play</button>
                    <button className="btn-outline" onClick={handleShuffle}>Shuffle</button>
                  </>
                )}
                <button className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? `Uploading ${uploadProgress}%` : 'Upload Song'}
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
          </section>

          {uploading && (
            <div className="upload-bar-wrap">
              <div className="upload-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <section className="songs-panel">
            {loading ? (
              <div className="songs-loading"><div className="spinner" /></div>
            ) : songs.length === 0 ? (
              <div className="songs-empty">
                <div className="songs-empty-inner">
                  <span>T</span>
                  <p>No songs yet. Upload the first MP3 for this album.</p>
                  <button className="btn-primary" onClick={() => fileRef.current?.click()}>Upload Song</button>
                </div>
              </div>
            ) : (
              <>
                <div className="songs-head">
                  <span />
                  <span>Song</span>
                  <span>Artist</span>
                  <span>Time</span>
                  <span />
                </div>
                {songs.map((song, i) => {
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
                        <span className="song-thumb">{album.name.slice(0, 1).toUpperCase()}</span>
                        <p className="song-title">{song.title}</p>
                      </div>
                      <span className="song-artist">Tadipaar's Library</span>
                      <span className="song-duration">{formatDuration(song.duration)}</span>
                      <button className="song-delete" onClick={e => handleDelete(e, song.id)}>x</button>
                    </div>
                  );
                })}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
