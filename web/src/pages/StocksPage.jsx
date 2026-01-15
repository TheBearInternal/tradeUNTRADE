import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiTrendingUp, FiX, FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import { assetsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const StocksPage = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('trades');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    loadAssets();
  }, [pagination.page, sortBy, sortOrder]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        loadAssets();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await assetsAPI.getAll(params);

      setAssets(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load stocks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSortBy('trades');
    setSortOrder('DESC');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same sort field
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder('DESC');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleAssetClick = (ticker) => {
    navigate(`/stocks/${ticker}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const hasActiveFilters = searchQuery.trim() || sortBy !== 'trades' || sortOrder !== 'DESC';

  if (loading && assets.length === 0) {
    return <LoadingSpinner size="lg" text="Loading stocks..." />;
  }

  if (error && assets.length === 0) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="Error loading stocks"
        description={error}
        action={
          <button onClick={loadAssets} className="btn-primary">
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Stocks & Assets
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Track which stocks politicians are trading
        </p>
      </div>

      {/* Search & Filters Card */}
      <div className="card">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticker or company name..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort by:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSortChange('trades')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'trades'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Most Traded {sortBy === 'trades' && (sortOrder === 'DESC' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSortChange('politicians')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'politicians'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Most Politicians {sortBy === 'politicians' && (sortOrder === 'DESC' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'name'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Alphabetical {sortBy === 'name' && (sortOrder === 'DESC' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSortChange('recent')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'recent'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Recent Activity {sortBy === 'recent' && (sortOrder === 'DESC' ? '↓' : '↑')}
              </button>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
              >
                <FiX className="w-4 h-4" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {assets.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} assets
        </div>
      )}

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <EmptyState
          icon={FiBarChart2}
          title="No stocks found"
          description={searchQuery ? "Try adjusting your search or filters" : "No stock data available at this time"}
          action={hasActiveFilters ? (
            <button onClick={handleClearFilters} className="btn-primary">
              Clear Filters
            </button>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => handleAssetClick(asset.ticker)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="space-y-3">
                {/* Ticker Symbol */}
                <div>
                  <h3 className="font-mono font-bold text-xl text-gray-900 dark:text-white">
                    {asset.ticker}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {asset.company_name || 'N/A'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <FiTrendingUp className="w-4 h-4" />
                  <span>{asset.politician_count || 0} politician{asset.politician_count !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{asset.transaction_count || 0} trade{asset.transaction_count !== 1 ? 's' : ''}</span>
                </div>

                {/* Last Traded */}
                {asset.latest_transaction_date && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Last traded: {formatDate(asset.latest_transaction_date)}
                    </p>
                  </div>
                )}

                {/* Sector Badge (if available) */}
                {asset.sector && (
                  <div className="pt-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {asset.sector}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1 || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {pagination.page} of {pagination.totalPages}
          </div>

          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && assets.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-20 dark:bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <LoadingSpinner size="md" text="Loading..." />
          </div>
        </div>
      )}
    </div>
  );
};

export default StocksPage;
