import { View, Text, StyleSheet } from 'react-native';

export default function ChatTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Chat — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#6B7280', fontSize: 14 },
});
