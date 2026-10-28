// Neutral first-launch age screen and the parental gate (type a number shown in words).
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NumberPad from '../components/NumberPad.js';
import Btn from '../components/Btn.js';
import { numberToWords } from '../util.js';
import { colors, font } from '../theme.js';

/**
 * Asks for birth year only; never pre-filled. Reports just 'under13' | 'adult'.
 * Year-only input can't tell 12 from 13 for the boundary year, so that year counts as under 13.
 */
export function AgeGate({ onDone }) {
  const [year, setYear] = useState('');
  const [error, setError] = useState(null);
  const submit = () => {
    const y = Number(year);
    const now = new Date().getFullYear();
    if (year.length !== 4 || y < 1900 || y > now) {
      setError('Please enter a 4-digit year.');
      return;
    }
    onDone(now - y <= 13 ? 'under13' : 'adult');
  };
  return (
    <View>
      <Text style={styles.emoji}>🏫</Text>
      <Text style={styles.title}>What's your birth year?</Text>
      <Text style={styles.sub}>This helps us set up the game for you. We don't keep the year itself.</Text>
      <NumberPad value={year} onChange={(v) => { setYear(v); setError(null); }} length={4} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Btn label="Continue" variant="primary" disabled={year.length !== 4} onPress={submit} style={styles.cta} />
    </View>
  );
}

const randomTwoDigit = () => 10 + Math.floor(Math.random() * 90);

/** Grown-up check before real-money purchases (and before changing the age setting). */
export function ParentalGate({ onResult }) {
  const [target, setTarget] = useState(randomTwoDigit);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const check = () => {
    if (Number(entry) === target) {
      onResult(true);
      return;
    }
    setWrong(true);
    setEntry('');
    setTarget(randomTwoDigit());
  };
  return (
    <View>
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>Ask a grown-up</Text>
      <Text style={styles.sub}>Type the number:</Text>
      <Text style={styles.words}>{numberToWords(target)}</Text>
      <NumberPad value={entry} onChange={(v) => { setEntry(v); setWrong(false); }} length={2} />
      {wrong ? <Text style={styles.error}>Not quite. Here's a new number to try.</Text> : null}
      <View style={styles.row}>
        <Btn label="Cancel" onPress={() => onResult(false)} style={styles.flex} />
        <Btn label="Check" variant="primary" disabled={entry.length !== 2} onPress={check} style={[styles.flex, styles.gap]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 44, textAlign: 'center' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 4 },
  sub: { fontSize: font.body, color: colors.inkSoft, textAlign: 'center', marginTop: 6 },
  words: { fontSize: 28, fontWeight: '800', color: colors.chalk, textAlign: 'center', marginTop: 6 },
  error: { fontSize: font.small, color: colors.bad, textAlign: 'center', marginBottom: 6 },
  cta: { marginTop: 8, minHeight: 48 },
  row: { flexDirection: 'row', marginTop: 8 },
  flex: { flex: 1 },
  gap: { marginLeft: 8 },
});
