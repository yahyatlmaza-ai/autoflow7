import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Home, Package, Users, Truck, BarChart3, Settings, LogOut, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import '../styles/sidebar.css'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home, description: 'Overview & Statistics' },
    { path: '/orders', label: 'Orders', icon: Package, description: 'Manage Orders' },
    { path: '/customers', label: 'Customers', icon: Users, description: 'Customer Management' },
    { path: '/shipments', label: 'Shipments', icon: Truck, description: 'Track Shipments' },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Reports & Analytics' },
    { path: '/settings', label: 'Settings', icon: Settings, description: 'Settings & Config' },
  ]

  const closeSidebar = () => setIsOpen(false)

  return (
    <>
      <button 
        className="sidebar-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
        title={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="logo" onClick={closeSidebar}>
            <div className="logo-icon">⚡</div>
            <div className="logo-content">
              <span className="logo-text">Auto Flow</span>
              <span className="logo-subtitle">Platform</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-section-title">Main</p>
            {menuItems.slice(0, 1).map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeSidebar}
                  title={item.description}
                >
                  <Icon size={20} className="nav-icon" />
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-desc">{item.description}</span>
                  </div>
                  {isActive(item.path) && <ChevronRight size={16} className="nav-indicator" />}
                </Link>
              )
            })}
          </div>

          <div className="nav-section">
            <p className="nav-section-title">Management</p>
            {menuItems.slice(1, 4).map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeSidebar}
                  title={item.description}
                >
                  <Icon size={20} className="nav-icon" />
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-desc">{item.description}</span>
                  </div>
                  {isActive(item.path) && <ChevronRight size={16} className="nav-indicator" />}
                </Link>
              )
            })}
          </div>

          <div className="nav-section">
            <p className="nav-section-title">Tools</p>
            {menuItems.slice(4).map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeSidebar}
                  title={item.description}
                >
                  <Icon size={20} className="nav-icon" />
                  <div className="nav-content">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-desc">{item.description}</span>
                  </div>
                  {isActive(item.path) && <ChevronRight size={16} className="nav-indicator" />}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button 
            className="logout-btn"
            onClick={() => {
              // Handle logout
              closeSidebar()
            }}
            title="Logout from your account"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
    </>
  )
}
