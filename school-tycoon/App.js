// School Tycoon — app root.
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/ui/GameProvider.js';
import GameScreen from './src/ui/GameScreen.js';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2F5D50" />
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </SafeAreaProvider>
  );
}
