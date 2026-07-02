import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlbums, createAlbum, deleteAlbum } from '../api';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getAlbums().then(setAlbums).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const album = await createAlbum(newName.trim());
      setAlbums(prev => [album, ...prev]);
      setNewName('');
      setShowNew(false);
    } catch (err) {
      alert('Failed to create album');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this album and all its songs?')) return;
    await deleteAlbum(id);
    setAlbums(prev => prev.filter(a => a.id !== id));
  };

  const albumColors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  ];

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-logo">Tadipaar's</h1>
          <span className="home-subtitle">My Music</span>
        </div>
        <div className="home-header-right">
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Album</button>
          <button className="btn-ghost" onClick={logout} title="Logout">⏏</button>
        </div>
      </header>

      <main className="home-main">
        {showNew && (
          <div className="modal-overlay" onClick={() => setShowNew(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Create Album</h3>
              <form onSubmit={handleCreate}>
                <input
                  autoFocus
                  type="text"
                  placeholder="Album name..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="modal-input"
                />
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="home-empty">
            <div className="spinner" />
          </div>
        ) : albums.length === 0 ? (
          <div className="home-empty">
            <div className="empty-icon">🎵</div>
            <h2>No albums yet</h2>
            <p>Create your first album to get started</p>
            <button className="btn-primary" onClick={() => setShowNew(true)}>+ Create Album</button>
          </div>
        ) : (
          <div className="albums-grid">
            {albums.map((album, i) => (
              <div
                key={album.id}
                className="album-card"
                onClick={() => navigate(`/album/${album.id}`, { state: { album } })}
              >
                <div className="album-cover" style={{ background: albumColors[i % albumColors.length] }}>
                  <span className="album-cover-icon">🎵</span>
                </div>
                <div className="album-info">
                  <h3 className="album-name">{album.name}</h3>
                  <p className="album-date">
                    {new Date(album.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="album-delete" onClick={e => handleDelete(e, album.id)} title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
