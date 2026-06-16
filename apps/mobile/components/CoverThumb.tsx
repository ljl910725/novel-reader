import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';

interface Props {
  coverUrl?: string | null;
  title: string;
}

export function CoverThumb({ coverUrl, title }: Props) {
  if (coverUrl) {
    return <Image source={{ uri: coverUrl }} style={styles.cover} />;
  }
  return (
    <View style={[styles.cover, styles.placeholder]}>
      <Text style={styles.placeholderText} numberOfLines={2}>
        {title.slice(0, 4)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: 56,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  placeholderText: { fontSize: 11, color: colors.muted, textAlign: 'center' },
});
