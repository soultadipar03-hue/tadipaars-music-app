import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSongs, uploadSong, deleteSong, getAlbums, uploadAlbumCover, getCoverUrl } from '../api';
import { usePlayer } from '../context/PlayerContext';
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
  const [coverUrl, setCoverUrl] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileRef = useRef();
  const coverRef = useRef();

  useEffect(() => {
    getSongs(id).then(setSongs).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Fetch all albums — also check if this album has a cover already
    getAlbums().then(albums => {
      setAllAlbums(albums);
      const thisAlbum = albums.find(a => a.id === id);
      // If album has a cover stored, use our proxy URL
      if (thisAlbum?.cover_drive_file_id) {
        setCoverUrl(getCoverUrl(id));
      }
    }).catch(console.error);
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
    if (current && current.id === songs[index].id) {
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

  const handleCoverSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      await uploadAlbumCover(id, file);
      // Use proxy URL with cache-busting so the new image loads immediately
      setCoverUrl(getCoverUrl(id) + '&t=' + Date.now());
    } catch (err) {
      alert('Cover upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const formatDuration = (s) => {
    if (!s) return '--:--';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const Sidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">Discover</p>
        <button className="sidebar-item" onClick={() => navigate('/')}>
          <span className="sidebar-icon">H</span> Home
        </button>
      </div>
      <div className="sidebar-section">
        <p className="sidebar-label">Your Library</p>
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
      {/* Blurred background from cover art */}
      <div
        className={`album-bg-blur ${coverUrl ? '' : 'no-cover'}`}
        style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
      />

      <div className="music-shell">
        <Sidebar />

        <main className="album-main">
          {/* Top bar */}
          <header className="album-topbar">
            <p className="album-breadcrumb">Library / {album.name}</p>
            <div className="album-topbar-actions">
              <button className="btn-ghost" onClick={() => navigate('/')}>← Back</button>
            </div>
          </header>

          {/* Main content: left + right */}
          <div className="album-content">

            {/* LEFT — cover + meta + actions */}
            <div className="album-left">
              {/* Clickable cover */}
              <div
                className={`album-hero-cover ${coverUploading ? 'cover-uploading' : ''}`}
                onClick={() => coverRef.current?.click()}
                title="Click to change cover"
              >
                {coverUrl ? (
                  <img src={coverUrl} alt={album.name} className="album-cover-img" />
                ) : (
                  <span className="album-cover-title">{album.name}</span>
                )}
                <div className="album-cover-overlay">
                  <span className="album-cover-overlay-text">
                    {coverUploading ? 'Uploading…' : '📷 Change Cover'}
                  </span>
                </div>
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleCoverSelect}
                />
              </div>

              {/* Meta */}
              <div className="album-meta">
                <span className="album-meta-label">Album</span>
                <h1 className="album-meta-name">{album.name}</h1>
                <p className="album-meta-count">
                  {songs.length} song{songs.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="album-left-actions">
                {songs.length > 0 && (
                  <div className="album-action-row">
                    <button className="btn-primary" onClick={() => playSongs(songs, 0)}>▶ Play</button>
                    <button className="btn-outline" onClick={handleShuffle}>⇄ Shuffle</button>
                  </div>
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

            {/* RIGHT — songs list */}
            <div className="album-right">
              {uploading && (
                <div className="upload-bar-wrap">
                  <div className="upload-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {loading ? (
                <div className="songs-loading"><div className="spinner" /></div>
              ) : songs.length === 0 ? (
                <div className="songs-empty">
                  <div className="songs-empty-inner">
                    <span>T</span>
                    <p>No songs yet. Upload the first MP3.</p>
                    <button className="btn-primary" onClick={() => fileRef.current?.click()}>
                      Upload Song
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="songs-head">
                    <span>#</span>
                    <span>Title</span>
                    <span>Artist</span>
                    <span style={{ textAlign: 'right' }}>Time</span>
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
                        {/* # */}
                        <div className="song-num">
                          {isActive && isPlaying ? (
                            <span className="song-playing-bars">
                              <span /><span /><span />
                            </span>
                          ) : (
                            <span className="song-num-text">{i + 1}</span>
                          )}
                        </div>

                        {/* Title */}
                        <div className="song-info">
                          <span className="song-thumb">
                            {coverUrl
                              ? <img src={coverUrl} alt="" />
                              : album.name.slice(0, 1).toUpperCase()
                            }
                          </span>
                          <p className="song-title">{song.title}</p>
                        </div>

                        {/* Artist */}
                        <span className="song-artist">Tadipaar's Library</span>

                        {/* Duration */}
                        <span className="song-duration">{formatDuration(song.duration)}</span>

                        {/* Delete */}
                        <button
                          className="song-delete"
                          onClick={e => handleDelete(e, song.id)}
                          title="Delete"
                        >✕</button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
