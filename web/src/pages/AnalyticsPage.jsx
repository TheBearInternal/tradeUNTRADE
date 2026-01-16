import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiActivity,
  FiTrendingUp,
  FiBarChart2,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getAnalytics();
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading analytics..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="Error loading analytics"
        description={error}
        action={
          <button onClick={loadAnalytics} className="btn-primary">
            Try Again
          </button>
        }
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={FiBarChart2}
        title="No analytics data"
        description="Analytics data is not available at the moment."
      />
    );
  }

  const { overview, top_traders, most_traded_stocks, party_stats, sector_breakdown } = data;

  // Prepare party comparison data for chart
  const partyData = Object.entries(party_stats || {}).map(([party, stats]) => ({
    party,
    trades: stats.total_trades,
    avgTrades: (stats.total_trades / stats.count).toFixed(1),
  }));

  // Colors for charts
  const PARTY_COLORS = {
    Democrat: '#2563eb',
    Republican: '#dc2626',
  };

  const SECTOR_COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights into congressional trading activity
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Politicians */}
        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {overview.total_politicians}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Politicians Tracked
          </p>
        </div>

        {/* Total Transactions */}
        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {overview.total_transactions}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Transactions
          </p>
        </div>

        {/* Most Active Trader */}
        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {overview.most_active_trader?.full_name || 'N/A'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Most Active (This Week)
          </p>
          {overview.most_active_trader && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {overview.most_active_trader.transaction_count} trades
            </p>
          )}
        </div>

        {/* Most Traded Stock */}
        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <FiBarChart2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-bold font-mono text-gray-900 dark:text-white">
            {overview.most_traded_stock?.ticker || 'N/A'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Most Traded (This Week)
          </p>
          {overview.most_traded_stock && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {overview.most_traded_stock.trade_count} trades
            </p>
          )}
        </div>
      </div>

      {/* Top Traders and Most Traded Stocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Traders Section */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Most Active Traders
          </h2>
          <div className="space-y-2">
            {top_traders && top_traders.length > 0 ? (
              top_traders.slice(0, 10).map((trader, index) => (
                <Link
                  key={trader.id}
                  to={`/politicians/${trader.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {trader.full_name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={
                            trader.party === 'Democrat'
                              ? 'badge-democrat'
                              : trader.party === 'Republican'
                              ? 'badge-republican'
                              : 'badge'
                          }
                        >
                          {trader.party}
                        </span>
                        {trader.latest_transaction_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Latest: {new Date(trader.latest_transaction_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {trader.transaction_count}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">trades</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No trader data available
              </p>
            )}
          </div>
        </div>

        {/* Most Traded Stocks Section */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Most Traded Stocks
          </h2>
          <div className="space-y-2">
            {most_traded_stocks && most_traded_stocks.length > 0 ? (
              most_traded_stocks.slice(0, 10).map((stock, index) => (
                <Link
                  key={stock.ticker}
                  to={`/assets/${stock.ticker}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold font-mono text-gray-900 dark:text-white">
                        {stock.ticker}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {stock.company_name}
                      </p>
                      {stock.sector && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {stock.sector}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {stock.transaction_count}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stock.politician_count} traders
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                No stock data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Party Comparison Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Trading Activity by Party
        </h2>
        {partyData && partyData.length > 0 ? (
          <div className="space-y-6">
            {/* Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="party"
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="trades" name="Total Trades" radius={[8, 8, 0, 0]}>
                    {partyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PARTY_COLORS[entry.party] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {Object.entries(party_stats || {}).map(([party, stats]) => (
                <div
                  key={party}
                  className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={
                        party === 'Democrat'
                          ? 'badge-democrat'
                          : party === 'Republican'
                          ? 'badge-republican'
                          : 'badge'
                      }
                    >
                      {party}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.count} politicians
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Trades:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.total_trades}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Avg per Politician:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {(stats.total_trades / stats.count).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No party comparison data available
          </p>
        )}
      </div>

      {/* Sector Breakdown Section */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Popular Sectors
        </h2>
        {sector_breakdown && sector_breakdown.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sector_breakdown}
                    dataKey="count"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ sector, percent }) =>
                      `${sector} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={true}
                  >
                    {sector_breakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sector List */}
            <div className="space-y-2">
              {sector_breakdown.map((sector, index) => (
                <div
                  key={sector.sector}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length],
                      }}
                    ></div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {sector.sector}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {sector.count}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">trades</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No sector data available
          </p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
