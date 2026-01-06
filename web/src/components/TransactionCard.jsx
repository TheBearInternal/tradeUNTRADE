import { Link } from 'react-router-dom';
import { FiTrendingUp, FiTrendingDown, FiExternalLink } from 'react-icons/fi';
import { format } from 'date-fns';

const TransactionCard = ({ transaction }) => {
  const isPurchase = transaction.transaction_type === 'purchase';
  const isSale = transaction.transaction_type === 'sale';

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Amount undisclosed';
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    return `$${(min || max).toLocaleString()}+`;
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="card-hover animate-fade-in">
      <div className="flex items-start justify-between">
        {/* Left side - Main info */}
        <div className="flex-1 min-w-0">
          {/* Politician info */}
          <Link
            to={`/politicians/${transaction.politician_id}`}
            className="group"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {transaction.politician_name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {transaction.party && (
                <span className={`badge ${
                  transaction.party === 'Democrat' ? 'badge-democrat' :
                  transaction.party === 'Republican' ? 'badge-republican' :
                  'badge'
                }`}>
                  {transaction.party}
                </span>
              )}
              {transaction.state && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {transaction.state}
                </span>
              )}
            </div>
          </Link>

          {/* Asset info */}
          {transaction.ticker ? (
            <Link
              to={`/assets/${transaction.ticker}`}
              className="group mt-3 block"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {transaction.ticker}
                </span>
                <FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
              </div>
              {transaction.company_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {transaction.company_name}
                </p>
              )}
            </Link>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {transaction.asset_description || 'Asset not specified'}
              </p>
            </div>
          )}

          {/* Sector badge */}
          {transaction.sector && (
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {transaction.sector}
            </span>
          )}
        </div>

        {/* Right side - Transaction details */}
        <div className="ml-4 flex flex-col items-end space-y-2">
          {/* Transaction type badge */}
          <span className={`
            badge flex items-center space-x-1
            ${isPurchase ? 'badge-purchase' : isSale ? 'badge-sale' : 'badge'}
          `}>
            {isPurchase ? (
              <>
                <FiTrendingUp className="w-3 h-3" />
                <span>Purchase</span>
              </>
            ) : isSale ? (
              <>
                <FiTrendingDown className="w-3 h-3" />
                <span>Sale</span>
              </>
            ) : (
              <span>Exchange</span>
            )}
          </span>

          {/* Amount */}
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatAmount(transaction.amount_min, transaction.amount_max)}
            </p>
            {transaction.amount_range_code && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Range {transaction.amount_range_code}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            <p>{formatDate(transaction.transaction_date)}</p>
            {transaction.filing_date && (
              <p className="text-xs">
                Filed: {formatDate(transaction.filing_date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Filing link */}
      {transaction.filing_url && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a
            href={transaction.filing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1"
          >
            <span>View official filing</span>
            <FiExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default TransactionCard;
