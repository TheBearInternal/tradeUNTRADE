import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiUsers, FiAlertCircle } from 'react-icons/fi';
import { politiciansAPI } from '../services/api';
import PoliticianCard from '../components/PoliticianCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const PoliticiansPage = () => {
  const [politicians, setPoliticians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    party: '',
    office: '',
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadPoliticians();
  }, [filters, sortBy, sortOrder, pagination.page]);

  const loadPoliticians = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await politiciansAPI.getAll(params);

      setPoliticians(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (err) {
      console.error('Failed to load politicians:', err);
      setError('Failed to load politicians. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      loadPoliticians();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await politiciansAPI.search(searchTerm);
      setPoliticians(response.data.data);
      setPagination({
        page: 1,
        limit: 20,
        total: response.data.count,
        totalPages: 1,
      });
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === 'trades' ? 'DESC' : 'ASC');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      party: '',
      office: '',
    });
    setSortBy('name');
    setSortOrder('ASC');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = filters.party || filters.office || searchTerm;

  if (loading && politicians.length === 0) {
    return <LoadingSpinner size="lg" text="Loading politicians..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Politicians
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Browse and search U.S. politicians and their stock trading activity
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="input pl-10 w-full"
              />
            </div>
            <button type="submit" className="btn-primary px-6">
              Search
            </button>
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400 w-5 h-5" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filters:
              </span>
            </div>

            {/* Party Filter */}
            <select
              value={filters.party}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              className="input text-sm py-2"
            >
              <option value="">All Parties</option>
              <option value="Democrat">Democrat</option>
              <option value="Republican">Republican</option>
              <option value="Independent">Independent</option>
            </select>

            {/* Chamber Filter */}
            <select
              value={filters.office}
              onChange={(e) => handleFilterChange('office', e.target.value)}
              className="input text-sm py-2"
            >
              <option value="">All Chambers</option>
              <option value="house">House</option>
              <option value="senate">Senate</option>
            </select>

            {/* Sort Options */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort by:
              </span>
              <button
                onClick={() => handleSortChange('name')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'name'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Name {sortBy === 'name' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('trades')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'trades'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Trades {sortBy === 'trades' && (sortOrder === 'ASC' ? '↑' : '↓')}
              </button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-semibold">{politicians.length}</span> of{' '}
          <span className="font-semibold">{pagination.total}</span> politicians
        </p>
      </div>

      {/* Error State */}
      {error && (
        <EmptyState
          icon={FiAlertCircle}
          title="Error loading politicians"
          description={error}
          action={
            <button onClick={loadPoliticians} className="btn-primary">
              Try Again
            </button>
          }
        />
      )}

      {/* Politicians Grid */}
      {!error && politicians.length === 0 ? (
        <EmptyState
          icon={FiUsers}
          title="No politicians found"
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filters'
              : 'No politicians available at this time'
          }
          action={
            hasActiveFilters && (
              <button onClick={handleClearFilters} className="btn-primary">
                Clear Filters
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {politicians.map((politician) => (
              <PoliticianCard key={politician.id} politician={politician} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Loading Overlay */}
      {loading && politicians.length > 0 && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      )}
    </div>
  );
};

export default PoliticiansPage;
