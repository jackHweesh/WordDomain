import React, { useRef, useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Coordinate } from '../core/types';
import { Colors } from '../src/styles/theme';

interface TileProps {
  letter: string;
  coord: Coordinate;
  type: 'start' | 'end' | 'selected' | 'last-selected' | 'normal' | 'used' | 'hinted';
  disabled: boolean;
  onPress: () => void;
  size?: number;
  animationTrigger?: 'select' | 'unselect' | 'invalid' | null;
  isFading?: boolean;
}

export default function Tile({ letter, type, disabled, onPress, size, animationTrigger, isFading = false }: TileProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const shadowOffsetY = useRef(new Animated.Value(2)).current; // Idle: 2, pressed: 4, selected: 3
  const shadowOpacity = useRef(new Animated.Value(0.15)).current; // Idle: 0.15, pressed: 0.22, selected: 0.18
  const shadowRadius = useRef(new Animated.Value(3)).current; // Idle: 3, pressed: 6, selected: 4
  const elevation = useRef(new Animated.Value(4)).current; // Idle: 4, pressed: 8, selected: 6
  const [previousType, setPreviousType] = useState(type);
  const [previousTrigger, setPreviousTrigger] = useState(animationTrigger);
  const [previousIsFading, setPreviousIsFading] = useState(isFading);
  const [isPressed, setIsPressed] = useState(false);

  // Initialize shadow values based on tile type
  useEffect(() => {
    const isSelected = type === 'selected' || type === 'last-selected';
    const isStartOrEnd = type === 'start' || type === 'end';
    if (isSelected || isStartOrEnd) {
      scaleAnim.setValue(1.03);
      shadowOffsetY.setValue(3);
      shadowOpacity.setValue(0.18);
      shadowRadius.setValue(4);
      elevation.setValue(6);
    } else {
      scaleAnim.setValue(1.0);
      shadowOffsetY.setValue(2);
      shadowOpacity.setValue(0.15);
      shadowRadius.setValue(3);
      elevation.setValue(4);
    }
  }, []); // Only run on mount

  // Handle animation triggers
  useEffect(() => {
    if (animationTrigger === 'select') {
      // Scale animation for selection
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animationTrigger === 'unselect') {
      // Scale animation for unselection
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (animationTrigger === 'invalid') {
      // Shake animation for invalid tap
      Animated.sequence([
        Animated.timing(translateXAnim, {
          toValue: -4,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: 4,
          duration: 40,
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: 0,
          duration: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Reset trigger after animation
    if (animationTrigger && animationTrigger !== previousTrigger) {
      setPreviousTrigger(animationTrigger);
    }
  }, [animationTrigger, scaleAnim, translateXAnim, previousTrigger]);

  // Handle fade out animation when tile is marked as fading
  useEffect(() => {
    if (isFading && !previousIsFading) {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!isFading && previousIsFading) {
      // Reset opacity when no longer fading
      opacityAnim.setValue(1);
    }
    setPreviousIsFading(isFading);
  }, [isFading, previousIsFading, opacityAnim]);

  // Handle type changes for automatic animations and shadow updates
  useEffect(() => {
    const isSelected = type === 'selected' || type === 'last-selected';
    const isStartOrEnd = type === 'start' || type === 'end';
    const shouldHaveElevatedShadow = isSelected || isStartOrEnd;
    
    // If tile becomes selected (and wasn't before), animate selection
    if (isSelected && previousType === 'normal') {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.03, // Selected tiles stay slightly elevated
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Update shadow for selected state
      Animated.parallel([
        Animated.timing(shadowOffsetY, {
          toValue: 3,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(shadowOpacity, {
          toValue: 0.18,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(shadowRadius, {
          toValue: 4,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(elevation, {
          toValue: 6,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
    // If tile becomes normal (and was selected before), animate unselection
    else if (type === 'normal' && (previousType === 'selected' || previousType === 'last-selected')) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Return shadow to idle state
      Animated.parallel([
        Animated.timing(shadowOffsetY, {
          toValue: 2,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(shadowOpacity, {
          toValue: 0.15,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(shadowRadius, {
          toValue: 3,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(elevation, {
          toValue: 4,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
    // If tile is selected or start/end, maintain elevated shadow state
    else if (shouldHaveElevatedShadow && !isPressed) {
      scaleAnim.setValue(1.03);
      shadowOffsetY.setValue(3);
      shadowOpacity.setValue(0.18);
      shadowRadius.setValue(4);
      elevation.setValue(6);
    }
    // If tile is normal and not pressed, maintain idle state
    else if (type === 'normal' && !isPressed) {
      scaleAnim.setValue(1.0);
      shadowOffsetY.setValue(2);
      shadowOpacity.setValue(0.15);
      shadowRadius.setValue(3);
      elevation.setValue(4);
    }
    
    setPreviousType(type);
  }, [type, previousType, scaleAnim, shadowOffsetY, shadowOpacity, shadowRadius, elevation, isPressed]);

  if (!letter) {
  return (
    <TouchableOpacity
        style={[
          styles.tile, 
          styles.empty,
          size ? { width: size, height: size } : undefined
        ]} 
        disabled 
      />
  );
  }

  const getTileStyle = (): ViewStyle => {
  switch (type) {
      case 'start':
        return styles.startTile; // Start tile uses gold
      case 'end':
        return styles.endTile; // End tile uses gold
      case 'selected':
      case 'last-selected':
        return styles.selectedTile; // Selected tiles use royal blue
      case 'used':
        return styles.usedTile;
      case 'hinted':
        return styles.hintedTile; // Hinted tiles use sage green
    default:
      return styles.normalTile;
  }
};

  const isSelected = type === 'selected' || type === 'last-selected';
  const isStartOrEnd = type === 'start' || type === 'end';

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    
    // Animate to pressed state (lift upward)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(shadowOffsetY, {
        toValue: 4,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(shadowOpacity, {
        toValue: 0.22,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(shadowRadius, {
        toValue: 6,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(elevation, {
        toValue: 8,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    setIsPressed(false);
    
    // Return to appropriate state based on selection or start/end
    const shouldHaveElevatedShadow = isSelected || isStartOrEnd;
    const targetScale = shouldHaveElevatedShadow ? 1.03 : 1.0;
    const targetOffsetY = shouldHaveElevatedShadow ? 3 : 2;
    const targetOpacity = shouldHaveElevatedShadow ? 0.18 : 0.15;
    const targetRadius = shouldHaveElevatedShadow ? 4 : 3;
    const targetElevation = shouldHaveElevatedShadow ? 6 : 4;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: targetScale,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.timing(shadowOffsetY, {
        toValue: targetOffsetY,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(shadowOpacity, {
        toValue: targetOpacity,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(shadowRadius, {
        toValue: targetRadius,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(elevation, {
        toValue: targetElevation,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: scaleAnim },
            { translateX: translateXAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          {
            shadowColor: (isSelected || isStartOrEnd) ? Colors.accent : '#000',
            shadowOffset: {
              width: 0,
              height: shadowOffsetY,
            },
            shadowOpacity: shadowOpacity,
            shadowRadius: shadowRadius,
            elevation: elevation,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tile, 
            getTileStyle(), 
            disabled && styles.disabled,
            size && { width: size, height: size },
            isSelected && styles.selectedTileGlow,
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1} // We handle opacity with animations
        >
          <Text style={[
            styles.letter, 
            type === 'used' && styles.usedLetter,
            type === 'end' && styles.endLetter,
            (type === 'selected' || type === 'last-selected') && styles.selectedLetter,
            type === 'start' && styles.startLetter,
            type === 'hinted' && styles.hintedLetter
          ]}>
            {letter.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8, // Rounded like premium tiles
    margin: 2,
    // Shadow is now handled by animated wrapper
  },
  empty: {
    backgroundColor: 'transparent', // Transparent for empty spaces
  },
  normalTile: {
    backgroundColor: Colors.tileBackground,
    borderWidth: 2,
    borderColor: Colors.tileBorder,
  },
  endTile: {
    backgroundColor: Colors.accent, // Gold for end tile
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  startTile: {
    backgroundColor: Colors.accent, // Gold for start tile
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  selectedTile: {
    backgroundColor: Colors.accentSecondary, // Royal blue for selected tiles
    borderWidth: 2,
    borderColor: Colors.accentSecondary,
  },
  selectedTileGlow: {
    // Additional glow effect for selected tiles (combined with animated shadow)
    // The main shadow is handled by the animated wrapper
  },
  usedTile: {
    backgroundColor: '#E8DDD4', // Warm muted beige for used tiles
    borderWidth: 1,
    borderColor: '#CBBBA4', // Soft warm outline
    opacity: 0.6,
  },
  hintedTile: {
    backgroundColor: Colors.hintGreen, // Sage green for hinted tiles
    borderWidth: 2,
    borderColor: Colors.hintGreen,
  },
  disabled: {
    opacity: 0.3,
  },
  letter: {
    fontSize: 20,
    fontWeight: '900', // Extra bold like Bananagram
    color: '#4A3426', // Dark chocolate brown
    letterSpacing: 0.5,
  },
  usedLetter: {
    color: '#8B7A6B', // Muted brown for used tiles
  },
  endLetter: {
    color: '#4A3426', // Dark chocolate brown (readable on caramel)
  },
  startLetter: {
    color: Colors.textPrimary, // Dark text for readability on gold
  },
  selectedLetter: {
    color: Colors.textPrimary, // Dark text for readability on gold
  },
  hintedLetter: {
    color: Colors.textPrimary, // Dark text for readability on sage green
  },
});
