import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiSettings, FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    defaultView: 'recent_transactions'
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState({ type: '', text: '' });

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load user preferences (if stored in user object)
  useEffect(() => {
    if (user) {
      setPreferences({
        emailNotifications: user.email_notifications ?? true,
        defaultView: user.default_view || 'recent_transactions'
      });
    }
  }, [user]);

  // Password change handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must contain uppercase, lowercase, and number'
      });
      return;
    }

    try {
      setPasswordLoading(true);
      await usersAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Clear message after 5 seconds
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to change password'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Preferences save handler
  const handleSavePreferences = async () => {
    setPreferencesMessage({ type: '', text: '' });

    try {
      setPreferencesLoading(true);
      await usersAPI.updatePreferences(preferences);

      setPreferencesMessage({ type: 'success', text: 'Preferences saved successfully!' });

      // Clear message after 5 seconds
      setTimeout(() => setPreferencesMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      setPreferencesMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to save preferences'
      });
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      return;
    }

    try {
      setDeleteLoading(true);
      await usersAPI.deleteAccount();

      // Logout and redirect to register page
      logout();
      navigate('/register');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (!user) {
    return <LoadingSpinner size="lg" text="Loading profile..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Profile & Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FiUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Account Information
            </h2>
          </div>

          {/* User Info Display */}
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">{user.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Member Since
              </label>
              <p className="mt-1 text-gray-900 dark:text-white">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Change Password Form */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FiLock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Password
              </h3>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  At least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Password Messages */}
              {passwordMessage.text && (
                <div
                  className={`flex items-center space-x-2 p-3 rounded-lg ${
                    passwordMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <FiCheck className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <FiX className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{passwordMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
                  hover:bg-blue-700 transition-colors font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <FiSettings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Preferences</h2>
          </div>

          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Theme
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive email alerts for trades
                </p>
              </div>
              <button
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    emailNotifications: !preferences.emailNotifications
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Default View Preference */}
            <div>
              <label
                htmlFor="defaultView"
                className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
              >
                Default Home View
              </label>
              <select
                id="defaultView"
                value={preferences.defaultView}
                onChange={(e) =>
                  setPreferences({ ...preferences, defaultView: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent_transactions">Recent Transactions</option>
                <option value="top_traders">Top Traders</option>
                <option value="most_traded_stocks">Most Traded Stocks</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose what you see first on the home page
              </p>
            </div>

            {/* Preferences Messages */}
            {preferencesMessage.text && (
              <div
                className={`flex items-center space-x-2 p-3 rounded-lg ${
                  preferencesMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                }`}
              >
                {preferencesMessage.type === 'success' ? (
                  <FiCheck className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <FiX className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="text-sm">{preferencesMessage.text}</span>
              </div>
            )}

            <button
              onClick={handleSavePreferences}
              disabled={preferencesLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors font-medium
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preferencesLoading ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Account Actions Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Danger Zone
            </h2>
          </div>

          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg
                hover:bg-red-700 transition-colors font-medium whitespace-nowrap ml-4"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Account
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete your account and all associated data. This action
              cannot be undone.
            </p>

            <div className="mb-4">
              <label
                htmlFor="deleteConfirmation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to
                confirm
              </label>
              <input
                type="text"
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600
                  text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50
                  dark:hover:bg-gray-800 transition-colors font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg
                  hover:bg-red-700 transition-colors font-medium
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
