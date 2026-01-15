import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiDollarSign,
  FiExternalLink,
  FiAlertCircle
} from 'react-icons/fi';
import { format } from 'date-fns';
import { politiciansAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const PoliticianDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [politician, setPolitician] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transaction filters and sorting
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadPoliticianData();
  }, [id]);

  useEffect(() => {
    loadTransactions();
  }, [id, filterType, sortBy, currentPage]);

  const loadPoliticianData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await politiciansAPI.getById(id);
const data = response.data.data;

// Extract stats, rest is politician data
const { stats: statsData, ...politicianData } = data;
setPolitician(politicianData);
setStats(statsData);
    } catch (err) {
      console.error('Failed to load politician:', err);
      setError('Failed to load politician details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortBy,
      };

      if (filterType !== 'all') {
        params.type = filterType;
      }

      const response = await politiciansAPI.getTransactions(id, params);
      const data = response.data.data;

      setTransactions(data.transactions || data);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Undisclosed';
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    return `$${(min || max).toLocaleString()}+`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getPartyBadgeClass = (party) => {
    if (party === 'Democrat') return 'badge-democrat';
    if (party === 'Republican') return 'badge-republican';
    return 'badge';
  };

  const getOfficeBadgeClass = (office) => {
    if (office === 'Senate') return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    if (office === 'House') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading politician details..." />;
  }

  if (error || !politician) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="Error loading politician"
        description={error || 'Politician not found'}
        action={
          <button onClick={() => navigate('/politicians')} className="btn-primary">
            Back to Politicians
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate('/politicians')}
        className="btn-ghost flex items-center space-x-2"
      >
        <FiArrowLeft className="w-4 h-4" />
        <span>Back to Politicians</span>
      </button>

      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {politician.full_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {politician.party && (
                <span className={`badge ${getPartyBadgeClass(politician.party)}`}>
                  {politician.party}
                </span>
              )}
              {politician.office && (
                <span className={`badge ${getOfficeBadgeClass(politician.office)}`}>
                  {politician.office}
                </span>
              )}
              {politician.state && (
                <span className="badge">
                  {politician.state}
                </span>
              )}
            </div>

            {politician.chamber && (
              <p className="text-gray-600 dark:text-gray-400">
                {politician.chamber}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Transactions */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <FiActivity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.total_transactions || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Transactions
            </p>
          </div>

          {/* Total Purchases */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <FiTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.total_purchases || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Purchases
            </p>
          </div>

          {/* Total Sales */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FiTrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.total_sales || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Sales
            </p>
          </div>

          {/* Estimated Portfolio Value */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {formatAmount(stats.estimated_portfolio_min, stats.estimated_portfolio_max)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Estimated Portfolio Value
            </p>
          </div>

          {/* First Transaction Date */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {formatDate(stats.first_transaction_date)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              First Transaction
            </p>
          </div>

          {/* Latest Transaction Date */}
          <div className="card text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <FiCalendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {formatDate(stats.latest_transaction_date)}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Latest Transaction
            </p>
          </div>
        </div>
      )}

      {/* Trading History */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">
            Trading History
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter by Type */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="input py-2 text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="purchase">Purchases Only</option>
              <option value="sale">Sales Only</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="input py-2 text-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        {transactionsLoading ? (
          <div className="py-8">
            <LoadingSpinner size="md" text="Loading transactions..." />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={FiActivity}
            title="No transactions found"
            description="This politician has no transactions matching your filters."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Filing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/transactions/${transaction.id}`)}
                    >
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${
                          transaction.transaction_type === 'purchase' ? 'badge-purchase' :
                          transaction.transaction_type === 'sale' ? 'badge-sale' :
                          'badge'
                        }`}>
                          {transaction.transaction_type === 'purchase' && (
                            <FiTrendingUp className="w-3 h-3 mr-1" />
                          )}
                          {transaction.transaction_type === 'sale' && (
                            <FiTrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {transaction.transaction_type?.charAt(0).toUpperCase() +
                           transaction.transaction_type?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          {transaction.ticker ? (
                            <>
                              <span className="font-mono font-bold text-gray-900 dark:text-white">
                                {transaction.ticker}
                              </span>
                              {transaction.company_name && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                  {transaction.company_name}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {transaction.asset_description || 'N/A'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(transaction.amount_min, transaction.amount_max)}
                      </td>
                      <td className="px-4 py-4">
                        {transaction.filing_url && (
                          <a
                            href={transaction.filing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1"
                          >
                            <span className="text-sm">View</span>
                            <FiExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PoliticianDetailPage;
