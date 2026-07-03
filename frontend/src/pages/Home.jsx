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

  const openAlbum = (album) => navigate(`/album/${album.id}`, { state: { album } });

  const albumColors = [
    'linear-gradient(135deg, #3b0710 0%, #7d1022 45%, #f6b29a 100%)',
    'linear-gradient(135deg, #071c2f 0%, #155c85 48%, #a8e6ff 100%)',
    'linear-gradient(135deg, #10210d 0%, #3d7b32 48%, #f1df8f 100%)',
    'linear-gradient(135deg, #21112d 0%, #7d3cb1 48%, #f4b5ff 100%)',
    'linear-gradient(135deg, #2b1c09 0%, #b06b1f 48%, #ffd19a 100%)',
    'linear-gradient(135deg, #101113 0%, #53575c 48%, #d9dee5 100%)',
  ];

  const Sidebar = () => (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">Discover</p>
        <button className="sidebar-item active"><span className="sidebar-icon">H</span> Home</button>
      </div>
      <div className="sidebar-section">
        <p className="sidebar-label">Playlists</p>
        {albums.slice(0, 5).map(album => (
          <button key={album.id} className="sidebar-item dim" onClick={() => openAlbum(album)}>
            <span className="sidebar-icon">P</span> {album.name}
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
    <div className="home">
      <div className="music-shell">
        <Sidebar />
        <main className="music-main">
          <header className="home-topbar">
            <div>
              <p className="home-kicker">Personal Music Universe</p>
              <h1 className="home-logo">Tadipaar's Library</h1>
            </div>
            <div className="home-header-right">
              <div className="search-pill"><span>Search</span><span>Find in library</span></div>
              <button className="btn-primary" onClick={() => setShowNew(true)}>New Album</button>
              <button className="btn-ghost" onClick={logout} title="Logout">Logout</button>
            </div>
          </header>

          <section className="home-feature">
            <div className="feature-cover"><span>Tadipaar's</span></div>
            <div className="feature-copy">
              <h2>Your music, staged properly.</h2>
              <p>Upload tracks to Drive, arrange them into albums, and play them back from a private, polished library made for long listening sessions.</p>
              <button className="btn-outline" onClick={() => setShowNew(true)}>Create playlist album</button>
            </div>
          </section>

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
              <div className="empty-panel">
                <div className="empty-icon">T</div>
                <h2>No albums yet</h2>
                <p>Create your first album to start building the library.</p>
                <button className="btn-primary" onClick={() => setShowNew(true)}>Create Album</button>
              </div>
            </div>
          ) : (
            <>
              <div className="section-head">
                <div>
                  <h2>Recently Added</h2>
                  <p>{albums.length} album{albums.length !== 1 ? 's' : ''} in your collection</p>
                </div>
              </div>
              <div className="albums-grid">
                {albums.map((album, i) => (
                  <div key={album.id} className="album-card" onClick={() => openAlbum(album)}>
                    <div
                      className="album-cover"
                      style={album.cover_image_url ? {} : { background: albumColors[i % albumColors.length] }}
                    >
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt={album.name} className="album-cover-img" />
                      ) : (
                        <span className="album-cover-icon">{album.name}</span>
                      )}
                    </div>
                    <div className="album-info">
                      <h3 className="album-name">{album.name}</h3>
                      <p className="album-date">{new Date(album.created_at).toLocaleDateString()}</p>
                    </div>
                    <button className="album-delete" onClick={e => handleDelete(e, album.id)} title="Delete">x</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
