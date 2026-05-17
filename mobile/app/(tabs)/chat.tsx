import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { askCouncil } from '../../lib/chat-api';
import { pickThree } from '../../lib/chat-prompts';
import type { ChatExpertReading, ChatOracle } from '../../lib/chat-api';
import type { Database } from '../../lib/database.types';

type BirthDataRow = Database['public']['Tables']['birth_data']['Row'];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXPERT_TRADITION: Record<string, string> = {
  stella: 'western',
  priya: 'vedic',
  'master-wei': 'chinese',
  'madame-crow': 'tarot',
  pythia: 'numerology',
};

const TRADITION_LABEL: Record<string, string> = {
  western: 'Astrology (Stella)',
  vedic: 'Vedic (Priya)',
  chinese: 'Chinese (Master Wei)',
  tarot: 'Tarot (Madame Crow)',
  numerology: 'Numerology (Pythia)',
};

type UserMsg = { role: 'user'; content: string; createdAt: string };
type AssistantMsg = {
  role: 'assistant';
  content: string;
  createdAt: string;
  oracle?: ChatOracle;
  experts?: ChatExpertReading[];
  isError?: boolean;
  retryQuestion?: string;
};
type Msg = UserMsg | AssistantMsg;

function TypingDots() {
  const dot0 = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function loopDot(dot: Animated.Value, startDelay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(startDelay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 300, useNativeDriver: true }),
          Animated.delay(Math.max(0, 600 - startDelay)),
        ])
      );
    }
    const a0 = loopDot(dot0, 0);
    const a1 = loopDot(dot1, 200);
    const a2 = loopDot(dot2, 400);
    a0.start();
    a1.start();
    a2.start();
    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, [dot0, dot1, dot2]);

  return (
    <View style={styles.typingWrap}>
      {[dot0, dot1, dot2].map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { opacity: dot }]} />
      ))}
    </View>
  );
}

function ChimerAside({ expert }: { expert: ChatExpertReading }) {
  const [open, setOpen] = useState(false);
  const trad = EXPERT_TRADITION[expert.expertId] ?? '';
  const label = TRADITION_LABEL[trad] ?? expert.expertName;
  const oneLiner = expert.content?.oneLiner ?? expert.error ?? '';
  const summary = expert.content?.summary ?? '';

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  }

  return (
    <View style={styles.chimerContainer}>
      <Pressable onPress={toggle} style={styles.chimerHeader}>
        <Text style={styles.chimerEmoji}>{expert.expertEmoji}</Text>
        <View style={styles.chimerBody}>
          <Text style={styles.chimerLabel}>{label}</Text>
          {!!oneLiner && <Text style={styles.chimerOneLiner}>{oneLiner}</Text>}
        </View>
        {!!summary && (
          <Text style={styles.chimerToggle}>{open ? '▲' : '▼'}</Text>
        )}
      </Pressable>
      {open && !!summary && (
        <Text style={styles.chimerSummary}>{summary}</Text>
      )}
    </View>
  );
}

function MessageBubble({ item, onRetry }: { item: Msg; onRetry?: (q: string) => void }) {
  if (item.role === 'user') {
    return (
      <View style={styles.userBubbleWrap}>
        <View style={styles.userBubble}>
          <Text style={styles.bubbleText}>{item.content}</Text>
        </View>
      </View>
    );
  }

  const msg = item as AssistantMsg;
  const chimers = msg.oracle?.chimers ?? [];
  const chimerExperts = (msg.experts ?? []).filter((e) => {
    const trad = EXPERT_TRADITION[e.expertId];
    return trad && chimers.includes(trad);
  });

  return (
    <View style={styles.assistantBubbleWrap}>
      <View style={[styles.assistantBubble, msg.isError && styles.errorBubble]}>
        <Text style={[styles.bubbleText, msg.isError && styles.errorText]}>
          {item.content}
        </Text>
        {msg.isError && msg.retryQuestion && onRetry && (
          <Pressable onPress={() => onRetry(msg.retryQuestion!)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        )}
      </View>
      {chimerExperts.length > 0 && (
        <View style={styles.chimersWrap}>
          {chimerExperts.map((e) => (
            <ChimerAside key={e.expertId} expert={e} />
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyStateText() {
  return (
    <View style={styles.emptyStateWrap}>
      <Text style={styles.emptyStateText}>Ask anything about today.</Text>
    </View>
  );
}

export default function ChatTab() {
  const insets = useSafeAreaInsets();
  const todayISO = useRef(new Date().toLocaleDateString("en-CA")).current; // YYYY-MM-DD in device timezone

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [birthData, setBirthData] = useState<BirthDataRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<string[]>(() => pickThree());
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);

      const [{ data: bd }, { data: history }] = await Promise.all([
        supabase
          .from('birth_data')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('chat_messages')
          .select('role, content, created_at, oracle, experts')
          .eq('user_id', session.user.id)
          .eq('chat_date', todayISO)
          .order('created_at'),
      ]);

      if (bd) setBirthData(bd);
      if (history) {
        setMessages(
          history.map((row) => ({
            role: row.role as 'user' | 'assistant',
            content: row.content,
            createdAt: row.created_at,
            ...(row.role === 'assistant' && row.oracle ? { oracle: row.oracle as unknown as ChatOracle } : {}),
            ...(row.role === 'assistant' && row.experts ? { experts: row.experts as unknown as ChatExpertReading[] } : {}),
          }))
        );
      }
      setLoading(false);
    }

    void init();
  }, [todayISO]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || pending || !birthData || !userId) return;
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      if (!freshSession) return;
      const accessToken = freshSession.access_token;

      setInput('');
      const createdAt = new Date().toISOString();
      setMessages((prev) => [...prev, { role: 'user', content: q, createdAt }]);
      setPending(true);

      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'user',
        content: q,
        chat_date: todayISO,
      });

      try {
        const result = await askCouncil({
          question: q,
          birthData: {
            name: birthData.name,
            date: birthData.birthdate,
            time: birthData.birthtime,
            location: birthData.birthplace,
            latitude: birthData.latitude,
            longitude: birthData.longitude,
          },
          date: todayISO,
          accessToken,
          chart: birthData.chart_facts ?? undefined,
        });

        const oracleError = result.oracle.error;
        const content = result.oracle.summary || result.oracle.oneLiner;
        const assistantMsg: Msg = {
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
          oracle: result.oracle,
          experts: result.experts,
          isError: !!oracleError,
          retryQuestion: oracleError ? q : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          content,
          chat_date: todayISO,
          oracle: result.oracle as any,
          experts: result.experts as any,
        });
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              e instanceof Error
                ? e.message
                : 'The council could not be reached. Please try again.',
            createdAt: new Date().toISOString(),
            isError: true,
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [pending, birthData, userId, todayISO]
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  useEffect(() => {
    if (pending) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [pending]);

  if (loading) {
    return <View style={styles.container} />;
  }

  const showChips = !pending && !input.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Py</Text>
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => <MessageBubble item={item} onRetry={(q) => void send(q)} />}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={<EmptyStateText />}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
      />

      {/* Typing indicator */}
      {pending && <TypingDots />}

      {/* Composer */}
      <View style={[styles.composerWrap, { paddingBottom: insets.bottom + 8 }]}>
        {showChips && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            {prompts.map((p) => (
              <Pressable
                key={p}
                onPress={() => void send(p)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{p}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPrompts((prev) => pickThree(prev))}
              style={styles.shuffleBtn}
            >
              <Text style={styles.shuffleText}>↻</Text>
            </Pressable>
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Py…"
            placeholderTextColor="rgba(245,240,232,0.2)"
            multiline
            numberOfLines={4}
            editable={!pending && !!birthData}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!input.trim() || pending || !birthData) && styles.sendBtnDisabled,
            ]}
            onPress={() => void send(input)}
            disabled={!input.trim() || pending || !birthData}
          >
            <Text
              style={[
                styles.sendBtnText,
                (!input.trim() || pending || !birthData) &&
                  styles.sendBtnTextDisabled,
              ]}
            >
              Send
            </Text>
          </Pressable>
        </View>

        {!birthData && (
          <Text style={styles.noBirthHint}>
            Add your birth data on the Me tab to start chatting
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14' },

  header: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2F3E',
    backgroundColor: '#0A0B14',
  },
  headerTitle: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#6B7280',
    fontFamily: 'Courier',
  },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },

  emptyStateWrap: { alignItems: 'center', paddingVertical: 32 },
  emptyStateText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: 'rgba(245,240,232,0.35)',
    fontFamily: 'Georgia',
  },

  // User bubble
  userBubbleWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: 'rgba(245,240,232,0.06)',
    padding: 12,
  },

  // Assistant bubble
  assistantBubbleWrap: { marginBottom: 20 },
  assistantBubble: {
    maxWidth: '88%',
    backgroundColor: 'rgba(191,168,130,0.12)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(191,168,130,1)',
    padding: 14,
  },
  errorBubble: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderLeftColor: '#F87171',
  },

  bubbleText: { fontSize: 15, color: '#F5F0E8', lineHeight: 22 },
  errorText: { color: '#F87171' },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { fontSize: 13, color: '#F87171', textDecorationLine: 'underline', fontFamily: 'Courier' },

  // Chimer asides
  chimersWrap: { maxWidth: '88%', marginTop: 2 },
  chimerContainer: {
    marginTop: 6,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(245,240,232,0.1)',
  },
  chimerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  chimerEmoji: { fontSize: 12, paddingTop: 1 },
  chimerBody: { flex: 1 },
  chimerLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6B7280',
    fontFamily: 'Courier',
    marginBottom: 2,
  },
  chimerOneLiner: { fontSize: 13, color: 'rgba(245,240,232,0.35)', lineHeight: 18 },
  chimerToggle: { fontSize: 10, color: '#6B7280', paddingTop: 1 },
  chimerSummary: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(245,240,232,0.35)',
    lineHeight: 20,
  },

  // Typing dots
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(191,168,130,1)',
  },

  // Composer
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: '#2D2F3E',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0A0B14',
  },
  chipsScroll: { marginBottom: 10 },
  chipsRow: { gap: 6, paddingRight: 4 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.35)',
    fontFamily: 'Courier',
  },
  shuffleBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245,240,232,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  shuffleText: { fontSize: 14, color: 'rgba(245,240,232,0.35)', fontFamily: 'Courier' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  textInput: {
    flex: 1,
    backgroundColor: '#13141F',
    borderWidth: 1,
    borderColor: '#2D2F3E',
    color: '#F5F0E8',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 96,
    textAlignVertical: 'top',
  },
  sendBtn: {
    backgroundColor: 'rgba(191,168,130,1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(191,168,130,0.2)' },
  sendBtnText: {
    color: '#0A0B14',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Courier',
  },
  sendBtnTextDisabled: { color: 'rgba(10,11,20,0.35)' },

  noBirthHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
