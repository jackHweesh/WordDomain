import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView, StyleSheet } from 'react-native';
import PuzzleScreen from './screens/PuzzleScreen';

export default function App() {
  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FAF8F3" 
        translucent={false}
      />
      <SafeAreaView style={styles.safeArea}>
        <PuzzleScreen />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F3', // Match the cream background
  },
});
