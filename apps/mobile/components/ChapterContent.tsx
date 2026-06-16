import type { ReaderTheme } from '@novel-reader/shared';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { htmlDocument, isHtmlContent, plainTextFromContent } from '@/src/lib/readerContent';

interface Props {
  content: string;
  theme: ReaderTheme;
}

export function ChapterContent({ content, theme }: Props) {
  if (isHtmlContent(content)) {
    return (
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlDocument(content, theme) }}
        style={styles.webview}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.textWrap} showsVerticalScrollIndicator={false}>
      <Text
        style={{
          color: theme.textColor,
          fontSize: theme.fontSize,
          lineHeight: theme.fontSize * theme.lineHeight,
          textAlign: 'justify',
        }}
      >
        {plainTextFromContent(content)}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: 'transparent' },
  textWrap: { paddingBottom: 16 },
});
