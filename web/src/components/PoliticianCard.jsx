import { Link } from 'react-router-dom';
import { FiTrendingUp, FiUsers } from 'react-icons/fi';

const PoliticianCard = ({ politician }) => {
  const { id, full_name, party, state, office, transaction_count } = politician;

  // Party badge color
  const partyColors = {
    Democrat: 'badge-democrat',
    Republican: 'badge-republican',
    Independent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  };

  const partyBadgeClass = partyColors[party] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';

  // Chamber display
  const chamberDisplay = office === 'house' ? 'House' : office === 'senate' ? 'Senate' : office;

  return (
    <Link
      to={`/politicians/${id}`}
      className="card card-hover group h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {full_name}
          </h3>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${partyBadgeClass}`}>
              {party}
            </span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="space-y-2 flex-1">
        <div className="flex items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 w-20">State:</span>
          <span className="font-medium text-gray-900 dark:text-white">{state}</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 w-20">Chamber:</span>
          <span className="font-medium text-gray-900 dark:text-white capitalize">{chamberDisplay}</span>
        </div>
      </div>

      {/* Trade Count Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <FiTrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Trades</span>
          </div>
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {transaction_count || 0}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PoliticianCard;
