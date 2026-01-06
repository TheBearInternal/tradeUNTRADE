import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PoliticiansScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Politicians Screen - Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
  },
});

export default PoliticiansScreen;
