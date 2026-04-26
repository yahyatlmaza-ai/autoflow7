import { Bell, Moon, Sun, User, Search, Settings, LogOut } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useState } from 'react'
import '../styles/header.css'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-search">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search orders, customers..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="action-btn notification-btn"
            title="View notifications"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </button>

          <button 
            className="action-btn theme-btn" 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="profile-menu-wrapper">
            <button 
              className="action-btn profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="Profile menu"
              aria-label="Profile menu"
            >
              <div className="profile-avatar">
                <User size={20} />
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-avatar-large">
                    <User size={24} />
                  </div>
                  <div className="profile-info">
                    <p className="profile-name">John Doe</p>
                    <p className="profile-email">john@example.com</p>
                  </div>
                </div>

                <div className="profile-menu-items">
                  <button className="profile-menu-item">
                    <User size={18} />
                    <span>My Profile</span>
                  </button>
                  <button className="profile-menu-item">
                    <Settings size={18} />
                    <span>Settings</span>
                  </button>
                </div>

                <button className="profile-menu-item logout">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
