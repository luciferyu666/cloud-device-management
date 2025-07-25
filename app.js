/*
 * This JavaScript file defines our simple front‑end application for managing
 * cloud devices.  It is entirely client‑side and uses React 18 (loaded
 * from a CDN) together with React Router DOM (v6) to provide routing.
 * A light/dark theme toggle is implemented using React context and
 * CSS variables.  Data is fetched from an API defined by the
 * API_BASE_URL constant; fallback mock data is provided when the
 * endpoint is unreachable.
 */

(() => {
  const { useState, useEffect, useContext, createContext } = React;
  const {
    BrowserRouter,
    Routes,
    Route,
    NavLink,
    useParams,
    useNavigate,
  } = ReactRouterDOM;

  // Base URL for backend API.  You can override this by setting
  // window.API_BASE_URL before this script loads.  If undefined, we
  // fall back to a blank string.  This allows the app to run off of a
  // relative path (e.g. `/api/devices`) when served from the same
  // origin as the backend.
  const API_BASE_URL = window.API_BASE_URL || '';

  /**
   * ThemeContext holds the current theme ("light" or "dark") and
   * exposes a function to toggle between them.  Components can access
   * the context to read the current theme and to trigger theme
   * changes.
   */
  const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

  /**
   * ThemeProvider component wraps the application and manages the
   * theme state.  It persists the user's preference in
   * localStorage so that the chosen theme is remembered across
   * sessions.  When the theme changes, it updates the
   * `data-theme` attribute on the document body so that CSS
   * variables update accordingly.
   */
  function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
      const stored = window.localStorage.getItem('theme');
      return stored === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
      document.body.setAttribute('data-theme', theme);
      window.localStorage.setItem('theme', theme);
    }, [theme]);

    function toggleTheme() {
      setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }
    return (
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  /**
   * Sidebar component renders the navigation links.  It uses
   * NavLink from React Router to highlight the active link based on
   * the current route.  The component is kept simple and can be
   * extended easily with additional sections.
   */
  function Sidebar() {
    return (
      <aside className="sidebar">
        <h1>Device Portal</h1>
        <NavLink end to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Dashboard
        </NavLink>
        <NavLink to="/devices" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Devices
        </NavLink>
      </aside>
    );
  }

  /**
   * Header component displays the page title and actions like theme
   * toggling.  The title prop can be passed from any page to set the
   * header text.  The theme toggle button displays an icon that
   * reflects the current theme.
   */
  function Header({ title }) {
    const { theme, toggleTheme } = useContext(ThemeContext);
    return (
      <header className="header">
        <h2>{title}</h2>
        <div className="actions">
          <button className="button outline" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>
    );
  }

  /**
   * fetchJson is a helper function that wraps fetch calls.  It
   * automatically prefixes the URL with the API_BASE_URL and
   * converts responses into JSON.  When an error occurs, it
   * rejects with an informative message.
   */
  async function fetchJson(path) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('API request failed:', err);
      throw err;
    }
  }

  /**
   * Dashboard component displays an overview of all devices.  It
   * fetches the device list and computes high‑level metrics such as
   * the total number of devices and total connected clients.  Cards
   * summarise the metrics and a small table lists a subset of
   * devices.  Clicking on a device row navigates to its detail page.
   */
  function Dashboard() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState(null);

    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          const list = await fetchJson('/devices');
          if (!cancelled) setDevices(list);
        } catch (err) {
          // Provide fallback data when API fails
          if (!cancelled) {
            setDevices([
              { id: 1, name: 'Router A', status: 'online', clients: 5 },
              { id: 2, name: 'Router B', status: 'offline', clients: 0 },
              { id: 3, name: 'Router C', status: 'online', clients: 12 },
            ]);
          }
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, []);

    if (!devices) {
      return (
        <div className="content">
          <Header title="Dashboard" />
          <div style={{ padding: '1rem' }}>
            <p>Loading devices...</p>
          </div>
        </div>
      );
    }

    const totalClients = devices.reduce((sum, d) => sum + (d.clients || 0), 0);

    return (
      <div className="content">
        <Header title="Dashboard" />
        <div style={{ padding: '1rem' }}>
          <div className="card" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <h3>Total Devices</h3>
              <p style={{ fontSize: '2rem', margin: '0.2rem 0' }}>{devices.length}</p>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <h3>Total Clients</h3>
              <p style={{ fontSize: '2rem', margin: '0.2rem 0' }}>{totalClients}</p>
            </div>
          </div>
          <div className="card">
            <h3>Devices</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Clients</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/devices/${d.id}`)}>
                    <td>{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.status}</td>
                    <td>{d.clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /**
   * DeviceList component displays a full list of devices in a table.
   * This page is separate from the dashboard and is accessible via
   * "/devices".  Each row is clickable and navigates to the device
   * details page.  When the API call fails the same fallback data
   * used in the dashboard is used.
   */
  function DeviceList() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState(null);

    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          const list = await fetchJson('/devices');
          if (!cancelled) setDevices(list);
        } catch (err) {
          if (!cancelled) {
            setDevices([
              { id: 1, name: 'Router A', status: 'online', clients: 5 },
              { id: 2, name: 'Router B', status: 'offline', clients: 0 },
              { id: 3, name: 'Router C', status: 'online', clients: 12 },
            ]);
          }
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, []);

    if (!devices) {
      return (
        <div className="content">
          <Header title="Devices" />
          <div style={{ padding: '1rem' }}>
            <p>Loading devices...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="content">
        <Header title="Devices" />
        <div style={{ padding: '1rem' }}>
          <div className="card">
            <h3>All Devices</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Clients</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/devices/${d.id}`)}>
                    <td>{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.status}</td>
                    <td>{d.clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /**
   * DeviceDetails component shows information about a single device.  It
   * retrieves the device ID from the route parameters and fetches
   * details from the API.  If the API call fails, a mock detail
   * object is used.  The page also includes a form that could be
   * extended to allow settings adjustments via API calls.
   */
  function DeviceDetails() {
    const { id } = useParams();
    const [device, setDevice] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          const detail = await fetchJson(`/devices/${id}`);
          if (!cancelled) setDevice(detail);
        } catch (err) {
          if (!cancelled) {
            setDevice({ id, name: `Router ${id}`, status: id % 2 ? 'online' : 'offline', clients: (id * 3) % 15, firmwareVersion: '1.2.3', ssid: 'MyWiFi', password: '******' });
          }
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [id]);

    if (!device) {
      return (
        <div className="content">
          <Header title="Device Details" />
          <div style={{ padding: '1rem' }}>
            <p>Loading device...</p>
          </div>
        </div>
      );
    }
    // Local state for editable fields (SSID and password) so that the
    // form can be updated by the user without mutating the device
    // object directly.  When the form is submitted, you would call
    // the appropriate API endpoints to save changes.
    const [ssid, setSsid] = useState(device.ssid);
    const [password, setPassword] = useState(device.password);

    function handleSubmit(e) {
      e.preventDefault();
      // In a real implementation you would POST/PUT to the API here
      alert(`Updated WiFi settings for ${device.name}: SSID ${ssid}`);
    }

    return (
      <div className="content">
        <Header title={`Device ${device.id}`} />
        <div style={{ padding: '1rem' }}>
          <button className="button outline" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
            ← Back
          </button>
          <div className="card">
            <h3>Device Information</h3>
            <p><strong>Name:</strong> {device.name}</p>
            <p><strong>Status:</strong> {device.status}</p>
            <p><strong>Connected Clients:</strong> {device.clients}</p>
            <p><strong>Firmware:</strong> {device.firmwareVersion}</p>
          </div>
          <div className="card">
            <h3>WiFi Settings</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>
                SSID
                <input type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', marginTop: '0.25rem' }} />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', marginTop: '0.25rem' }} />
              </label>
              <div>
                <button className="button" type="submit">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /**
   * NotFound component is rendered for unknown routes.  It provides
   * simple messaging and a link back to the dashboard.
   */
  function NotFound() {
    return (
      <div className="content">
        <Header title="Not Found" />
        <div style={{ padding: '1rem' }}>
          <p>The page you are looking for does not exist.</p>
          <NavLink to="/" className="button outline">Go to Dashboard</NavLink>
        </div>
      </div>
    );
  }

  /**
   * App component composes the application layout.  The Sidebar and
   * routing area are placed inside a flex container.  The ThemeProvider
   * wraps the entire tree so that theme data is available to all
   * components.
   */
  function App() {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="app-container">
            <Sidebar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/devices" element={<DeviceList />} />
              <Route path="/devices/:id" element={<DeviceDetails />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  // Render the app into the root element when the DOM is ready.  In
  // production you may use ReactDOM.createRoot for concurrent features,
  // but the UMD build for React 18 still exposes render() via
  // ReactDOM.
  document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('root');
    ReactDOM.render(<App />, rootEl);
  });
})();