import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiUsers, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { transactionsAPI, analyticsAPI } from '../services/api';
import websocket from '../services/websocket';
import TransactionCard from '../components/TransactionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const HomePage = () => {
  const [transactions, setTransactions] = useState([]);
  const [trending, setTrending] = useState({ politicians: [], tickers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTransactionCount, setNewTransactionCount] = useState(0);

  useEffect(() => {
    loadData();
    setupWebSocket();

    return () => {
      websocket.unsubscribe('all');
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [feedResponse, trendingResponse] = await Promise.all([
        transactionsAPI.getFeed(50),
        analyticsAPI.getTrending('7d', 10),
      ]);

      setTransactions(feedResponse.data.data);
      setTrending(trendingResponse.data.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Connect WebSocket if not connected
    if (!websocket.isConnected()) {
      websocket.connect();
    }

    // Subscribe to all transactions
    websocket.subscribe('all');

    // Listen for new transactions
    websocket.on('transaction', (newTransaction) => {
      setNewTransactionCount(prev => prev + 1);
      // Add new transaction to the top
      setTransactions(prev => [newTransaction, ...prev.slice(0, 49)]);
    });
  };

  const handleRefresh = () => {
    setNewTransactionCount(0);
    loadData();
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading latest trades..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={FiAlertCircle}
        title="Error loading data"
        description={error}
        action={
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Congressional Trading Tracker
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Monitor stock trades made by U.S. politicians in real-time. All data sourced from
          public financial disclosure filings.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <FiActivity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {transactions.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Recent Transactions
          </p>
        </div>

        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {trending.politicians.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Active Traders (7d)
          </p>
        </div>

        <div className="card text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
            {trending.tickers.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Trending Stocks (7d)
          </p>
        </div>
      </div>

      {/* Trending Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trending Politicians */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Most Active Politicians
            </h2>
            <Link to="/politicians" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {trending.politicians.slice(0, 5).map((politician) => (
              <Link
                key={politician.id}
                to={`/politicians/${politician.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {politician.full_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {politician.party} • {politician.state}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {politician.transaction_count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">trades</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trending Tickers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Most Traded Stocks
            </h2>
            <Link to="/assets" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {trending.tickers.slice(0, 5).map((ticker) => (
              <Link
                key={ticker.ticker}
                to={`/assets/${ticker.ticker}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-mono text-gray-900 dark:text-white">
                    {ticker.ticker}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {ticker.company_name || ticker.asset_name}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {ticker.transaction_count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ticker.unique_traders} traders
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recent Transactions
          </h2>
          {newTransactionCount > 0 && (
            <button
              onClick={handleRefresh}
              className="btn-primary flex items-center space-x-2 animate-pulse-slow"
            >
              <FiActivity className="w-4 h-4" />
              <span>{newTransactionCount} new trade{newTransactionCount !== 1 ? 's' : ''}</span>
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={FiActivity}
            title="No transactions yet"
            description="New transactions will appear here as they are filed."
          />
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
