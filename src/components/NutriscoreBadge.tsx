import React from 'react';
import { View, Text } from 'react-native';

interface NutriscoreBadgeProps {
  grade: string;
  size?: 'small' | 'medium' | 'large';
}

const NUTRISCORE_COLORS: Record<string, { bg: string; text: string }> = {
  a: { bg: '#10B981', text: '#FFFFFF' },
  b: { bg: '#84CC16', text: '#FFFFFF' },
  c: { bg: '#F59E0B', text: '#FFFFFF' },
  d: { bg: '#F97316', text: '#FFFFFF' },
  e: { bg: '#EF4444', text: '#FFFFFF' },
};

const SIZES = {
  small: { width: 32, height: 32, fontSize: 14, borderRadius: 10 },
  medium: { width: 44, height: 44, fontSize: 20, borderRadius: 12 },
  large: { width: 56, height: 56, fontSize: 26, borderRadius: 16 },
};

export function NutriscoreBadge({ grade, size = 'medium' }: NutriscoreBadgeProps) {
  const normalizedGrade = grade?.toLowerCase() || '';
  const colors = NUTRISCORE_COLORS[normalizedGrade] || { bg: '#94A3B8', text: '#FFFFFF' };
  const dimensions = SIZES[size];

  if (!grade || !NUTRISCORE_COLORS[normalizedGrade]) {
    return null;
  }

  return (
    <View
      style={{
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: colors.bg,
        borderRadius: dimensions.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.bg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: dimensions.fontSize,
          fontWeight: '800',
          textTransform: 'uppercase',
        }}
      >
        {normalizedGrade.toUpperCase()}
      </Text>
    </View>
  );
}

interface NutriscoreRowProps {
  grade: string;
}

export function NutriscoreRow({ grade }: NutriscoreRowProps) {
  const normalizedGrade = grade?.toLowerCase() || '';

  if (!grade || !NUTRISCORE_COLORS[normalizedGrade]) {
    return null;
  }

  const grades = ['a', 'b', 'c', 'd', 'e'];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {grades.map((g) => {
        const isActive = g === normalizedGrade;
        const colors = NUTRISCORE_COLORS[g];

        return (
          <View
            key={g}
            style={{
              width: isActive ? 36 : 28,
              height: isActive ? 36 : 28,
              backgroundColor: colors.bg,
              borderRadius: isActive ? 10 : 8,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isActive ? 1 : 0.35,
              shadowColor: isActive ? colors.bg : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.3 : 0,
              shadowRadius: 4,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: isActive ? 18 : 13,
                fontWeight: '800',
                textTransform: 'uppercase',
              }}
            >
              {g.toUpperCase()}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function getNutriscoreLabel(grade: string): string {
  const normalizedGrade = grade?.toLowerCase() || '';

  switch (normalizedGrade) {
    case 'a':
      return 'Excellent nutritional quality';
    case 'b':
      return 'Good nutritional quality';
    case 'c':
      return 'Average nutritional quality';
    case 'd':
      return 'Poor nutritional quality';
    case 'e':
      return 'Bad nutritional quality';
    default:
      return 'Unknown';
  }
}
