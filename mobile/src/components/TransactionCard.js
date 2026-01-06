import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { format } from 'date-fns';

const TransactionCard = ({ transaction }) => {
  const isPurchase = transaction.transaction_type === 'purchase';

  const formatAmount = (min, max) => {
    if (!min && !max) return 'Undisclosed';
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    return `$${(min || max).toLocaleString()}+`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.politicianInfo}>
          <Text style={styles.politicianName}>
            {transaction.politician_name}
          </Text>
          <View style={styles.badges}>
            {transaction.party && (
              <View
                style={[
                  styles.badge,
                  transaction.party === 'Democrat'
                    ? styles.badgeDemocrat
                    : styles.badgeRepublican,
                ]}
              >
                <Text style={styles.badgeText}>{transaction.party}</Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.typeBadge,
            isPurchase ? styles.typePurchase : styles.typeSale,
          ]}
        >
          <Icon
            name={isPurchase ? 'trending-up' : 'trending-down'}
            size={14}
            color="#fff"
          />
          <Text style={styles.typeText}>
            {isPurchase ? 'Buy' : 'Sell'}
          </Text>
        </View>
      </View>

      <View style={styles.assetInfo}>
        {transaction.ticker ? (
          <Text style={styles.ticker}>{transaction.ticker}</Text>
        ) : (
          <Text style={styles.assetDescription}>
            {transaction.asset_description || 'Asset not specified'}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.amount}>
          {formatAmount(transaction.amount_min, transaction.amount_max)}
        </Text>
        <Text style={styles.date}>
          {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  politicianInfo: {
    flex: 1,
  },
  politicianName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDemocrat: {
    backgroundColor: '#dbeafe',
  },
  badgeRepublican: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1f2937',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  typePurchase: {
    backgroundColor: '#10b981',
  },
  typeSale: {
    backgroundColor: '#ef4444',
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  assetInfo: {
    marginBottom: 12,
  },
  ticker: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#111827',
  },
  assetDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  date: {
    fontSize: 13,
    color: '#6b7280',
  },
});

export default TransactionCard;
