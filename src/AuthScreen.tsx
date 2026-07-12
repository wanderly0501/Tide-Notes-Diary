import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, Image, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { R, S, ColorsType } from './theme';
import { useTheme } from './ThemeContext';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [mode, setMode]       = useState<Mode>('signin');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  const clearError = () => setError('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) setError(error.message);
      } else {
        const redirectUrl = Linking.createURL('/auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });
        if (error) { setError(error.message); return; }
        if (!data?.url) { setError('Could not start Google sign-in'); return; }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success') {
          const parsed = Linking.parse(result.url);
          const code = parsed.queryParams?.code as string | undefined;
          if (code) {
            const { error: e } = await supabase.auth.exchangeCodeForSession(code);
            if (e) setError(e.message);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) setError(error.message);
        else setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <Image source={require('../logo/2.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.appName}>Tide</Text>
          <Text style={s.tagline}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</Text>

          {sent ? (
            <View style={s.sentBox}>
              <Text style={s.sentIcon}>✉️</Text>
              <Text style={s.sentTitle}>Check your email</Text>
              <Text style={s.sentBody}>We sent a confirmation link to {email}. Click it to activate your account.</Text>
              <TouchableOpacity onPress={() => { setSent(false); setMode('signin'); }} style={s.backLink}>
                <Text style={s.backLinkTxt}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Google */}
              <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} activeOpacity={0.85} disabled={loading}>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleTxt}>Continue with Google</Text>
              </TouchableOpacity>

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerTxt}>or</Text>
                <View style={s.dividerLine} />
              </View>

              {/* Email */}
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={C.textMuted}
                value={email}
                onChangeText={v => { setEmail(v); clearError(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                // @ts-ignore
                outlineStyle="none"
              />
              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={v => { setPassword(v); clearError(); }}
                secureTextEntry
                // @ts-ignore
                outlineStyle="none"
              />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity style={s.submitBtn} onPress={handleEmail} activeOpacity={0.85} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitTxt}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); clearError(); }}>
                <Text style={s.switchTxt}>
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={s.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(C: ColorsType) {
  return StyleSheet.create({
    root:       { flex: 1, backgroundColor: C.bg },
    scroll:     { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card:       { width: '100%', maxWidth: 400, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.10)' } as any }) },
    logo:       { width: 64, height: 64, marginBottom: 8 },
    appName:    { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
    tagline:    { fontSize: 14, color: C.textMuted, marginBottom: 28 },
    googleBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', height: 44, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, justifyContent: 'center', marginBottom: 20 },
    googleIcon: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
    googleTxt:  { fontSize: 14, fontWeight: '600', color: C.text },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', marginBottom: 20 },
    dividerLine:{ flex: 1, height: 1, backgroundColor: C.border },
    dividerTxt: { fontSize: 12, color: C.textMuted },
    input:      { width: '100%', height: 44, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: 14, fontSize: 14, color: C.text, backgroundColor: C.surface, marginBottom: 12, outlineWidth: 0 } as any,
    error:      { fontSize: 12, color: '#c62828', marginBottom: 10, alignSelf: 'flex-start' },
    submitBtn:  { width: '100%', height: 44, borderRadius: R.pill, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    submitTxt:  { fontSize: 14, fontWeight: '600', color: '#fff' },
    switchTxt:  { fontSize: 13, color: C.textMuted },
    switchLink: { color: C.buttonBlue, fontWeight: '600' },
    sentBox:    { alignItems: 'center', gap: 10 },
    sentIcon:   { fontSize: 36 },
    sentTitle:  { fontSize: 17, fontWeight: '600', color: C.text },
    sentBody:   { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
    backLink:   { marginTop: 8 },
    backLinkTxt:{ fontSize: 13, color: C.buttonBlue, fontWeight: '600' },
  });
}
