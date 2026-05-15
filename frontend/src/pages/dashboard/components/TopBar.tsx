import { useRef, useState } from 'react';
import type { DashboardSection } from './Sidebar';
import ExportHistoryPanel from './ExportHistoryPanel';
import SnapshotsPanel from './SnapshotsPanel';
import { useAuth } from '../../../hooks/useAuth';

const sectionMeta: Record<DashboardSection, { title: string; subtitle: string; icon: string }> = {
  overview: { title: 'Overview', subtitle: 'Your research analysis summary', icon: 'ri-dashboard-3-line' },
  datasets: { title: 'Datasets', subtitle: 'Manage and process your uploaded papers', icon: 'ri-database-2-line' },
  gaps: { title: 'Gap Detection', subtitle: 'Detected research gaps with explainability', icon: 'ri-radar-line' },
  history: { title: 'History', subtitle: 'Review saved analysis reports and uploaded papers', icon: 'ri-history-line' },
  trends: { title: 'Trend Analysis', subtitle: 'Topic publication trends over time', icon: 'ri-line-chart-line' },
  map: { title: 'Research Map', subtitle: '2D UMAP projection with gap connections', icon: 'ri-map-2-line' },
  chatbot: { title: 'AI Chatbot', subtitle: 'Ask questions about your uploaded papers', icon: 'ri-chat-3-line' },
  evaluation: { title: 'Evaluation', subtitle: 'Model quality metrics and statistics', icon: 'ri-bar-chart-grouped-line' },
};

interface TopBarProps {
  section: DashboardSection;
}

export default function TopBar({ section }: TopBarProps) {
  const { user, logout, uploadAvatar, updateProfile, updatePassword } = useAuth();
  const meta = sectionMeta[section];
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName = user?.name || 'Researcher';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('') || 'RL';

  const onUploadAvatar = async (file?: File) => {
    if (!file) return;
    setError('');
    setSuccess('');
    setAvatarLoading(true);
    const result = await uploadAvatar(file);
    setAvatarLoading(false);
    if (result.success) {
      setSuccess('Avatar updated successfully.');
    } else {
      setError(result.error || 'Avatar upload failed.');
    }
  };

  const onSaveProfile = async () => {
    setError('');
    setSuccess('');
    const trimmed = profileName.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    setProfileLoading(true);
    const result = await updateProfile(trimmed);
    setProfileLoading(false);
    if (result.success) {
      setSuccess('Profile updated successfully.');
    } else {
      setError(result.error || 'Failed to update profile.');
    }
  };

  const onSavePassword = async () => {
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    const result = await updatePassword(currentPassword, newPassword);
    setPasswordLoading(false);
    if (result.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } else {
      setError(result.error || 'Failed to update password.');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <i className={`${meta.icon} text-base`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{meta.title}</h2>
            <p className="text-xs text-gray-400">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search papers, topics..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 w-52 bg-gray-50"
            />
          </div>
          {/* Snapshots Button */}
          <button
            onClick={() => setSnapshotsOpen(true)}
            title="Saved Snapshots"
            className="whitespace-nowrap relative w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-colors cursor-pointer"
          >
            <i className="ri-bookmark-3-line text-sm" />
          </button>
          {/* Export History Button */}
          <button
            onClick={() => setHistoryOpen(true)}
            title="Export History"
            className="whitespace-nowrap relative w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-teal-600 hover:border-teal-200 transition-colors cursor-pointer"
          >
            <i className="ri-history-line text-sm" />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="whitespace-nowrap flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-gray-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 text-[11px] font-semibold flex items-center justify-center">
                  {initials}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 max-w-28 truncate">{displayName}</span>
              <i className="ri-arrow-down-s-line text-gray-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-20 p-1.5">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    setSettingsOpen(true);
                    setProfileName(user?.name ?? '');
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <i className="ri-user-settings-line mr-2 text-gray-500" />
                  Account settings
                </button>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <i className="ri-logout-box-r-line mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {settingsOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Account Settings</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage profile, avatar, and password</p>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && <div className="text-xs px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
              {success && <div className="text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">{success}</div>}

              <section className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-800">Profile</h4>
                <div className="flex items-center gap-4">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Current avatar" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold flex items-center justify-center border border-teal-200">
                      {initials}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onUploadAvatar(e.target.files?.[0])}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={avatarLoading}
                      className="whitespace-nowrap px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-700 disabled:opacity-50 cursor-pointer"
                    >
                      {avatarLoading ? 'Uploading...' : 'Upload Avatar'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Display name</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                    placeholder="Your name"
                  />
                </div>
                <button
                  onClick={onSaveProfile}
                  disabled={profileLoading}
                  className="whitespace-nowrap px-3 py-2 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 cursor-pointer"
                >
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </section>

              <section className="space-y-3 pt-1 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-800">Change Password</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>
                <button
                  onClick={onSavePassword}
                  disabled={passwordLoading}
                  className="whitespace-nowrap px-3 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-60 cursor-pointer"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      <ExportHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <SnapshotsPanel open={snapshotsOpen} onClose={() => setSnapshotsOpen(false)} />
    </>
  );
}
