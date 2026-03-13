import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Dimensions,
  Alert, ActivityIndicator, Animated, Modal, ScrollView, Share, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width, height } = Dimensions.get('window');

// Simulate video ad countdown (replace with actual AdMob in production)
function VideoAdModal({ visible, onAdComplete }: { visible: boolean; onAdComplete: () => void }) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      setCanSkip(false);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={adStyles.container}>
        {/* Simulated video ad */}
        <View style={adStyles.videoArea}>
          <View style={adStyles.adBadge}>
            <Text style={adStyles.adBadgeText}>AD</Text>
          </View>
          <View style={adStyles.videoPlaceholder}>
            <Text style={adStyles.videoIcon}>🎬</Text>
            <Text style={adStyles.videoTitle}>Advertisement</Text>
            <Text style={adStyles.videoSub}>Your ad content plays here</Text>
            <Text style={adStyles.videoSub2}>Integrate Google AdMob for real video ads</Text>
          </View>
        </View>

        {/* Skip / countdown */}
        <View style={adStyles.controls}>
          {canSkip ? (
            <TouchableOpacity style={adStyles.skipBtn} onPress={onAdComplete}>
              <Text style={adStyles.skipText}>Skip →</Text>
            </TouchableOpacity>
          ) : (
            <View style={adStyles.countdownContainer}>
              <Text style={adStyles.countdownText}>Skip in {countdown}s</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUrl: string; previewUrl: string; photographer: string; color: string; id: string;
  }>();

  const [downloading, setDownloading] = useState(false);
  const [setting, setSetting] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [actionAfterAd, setActionAfterAd] = useState<'download' | 'set' | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const requestPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  };

  const downloadImage = async () => {
    const permitted = await requestPermission();
    if (!permitted) {
      Alert.alert('Permission needed', 'Allow access to save wallpapers.');
      return;
    }

    setDownloading(true);
    try {
      const filename = `wallpaper_${params.id}_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(params.imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(result.uri);
      setDownloaded(true);
      Alert.alert('✅ Saved!', 'Wallpaper saved to your gallery.');
    } catch (e) {
      Alert.alert('Error', 'Failed to download. Please try again.');
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const setAsWallpaper = async () => {
    const permitted = await requestPermission();
    if (!permitted) {
      Alert.alert('Permission needed', 'Allow access to set wallpapers.');
      return;
    }

    setSetting(true);
    try {
      const filename = `wallpaper_${params.id}_${Date.now()}.jpg`;
      const fileUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(params.imageUrl, fileUri);
      const asset = await MediaLibrary.saveToLibraryAsync(result.uri);
      setDownloaded(true);

      Alert.alert(
        '🖼️ Wallpaper Ready!',
        'The wallpaper has been saved to your gallery. Open your Gallery app and set it as wallpaper from there.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to set wallpaper. Try again.');
      console.error(e);
    } finally {
      setSetting(false);
    }
  };

  const handleActionPress = (action: 'download' | 'set') => {
    setActionAfterAd(action);
    setShowAd(true); // Show video ad before any action
  };

  const handleAdComplete = () => {
    setShowAd(false);
    if (actionAfterAd === 'download') downloadImage();
    else if (actionAfterAd === 'set') setAsWallpaper();
    setActionAfterAd(null);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Amazing 3D Wallpaper by ${params.photographer} - Download from 3D WallPapers app!` });
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <VideoAdModal visible={showAd} onAdComplete={handleAdComplete} />

      {/* Full screen preview */}
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image source={{ uri: params.previewUrl }} style={styles.wallpaperImage} resizeMode="cover" />
        
        {/* Top gradient overlay */}
        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>↗ Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom overlay with actions */}
        <View style={styles.bottomOverlay}>
          <View style={styles.photographerInfo}>
            <Text style={styles.photographerLabel}>📸 Photo by</Text>
            <Text style={styles.photographerName}>{params.photographer}</Text>
          </View>

          <View style={styles.adNotice}>
            <Text style={styles.adNoticeText}>📺 A short ad will play before your action</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.downloadBtn]}
              onPress={() => handleActionPress('download')}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.actionIcon}>{downloaded ? '✅' : '⬇️'}</Text>
                  <Text style={styles.actionBtnText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.setBtn]}
              onPress={() => handleActionPress('set')}
              disabled={setting}
            >
              {setting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.actionIcon}>🖼️</Text>
                  <Text style={styles.actionBtnText}>Set Wallpaper</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>After saving, open Gallery → Set as Wallpaper</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const adStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoArea: { flex: 1 },
  adBadge: {
    position: 'absolute', top: 50, left: 16, zIndex: 10,
    backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
  },
  adBadgeText: { color: '#000', fontWeight: '800', fontSize: 11 },
  videoPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111',
  },
  videoIcon: { fontSize: 60, marginBottom: 16 },
  videoTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  videoSub: { color: '#aaa', fontSize: 14, marginBottom: 4 },
  videoSub2: { color: '#666', fontSize: 12 },
  controls: {
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16,
    flexDirection: 'row', justifyContent: 'flex-end',
  },
  skipBtn: {
    backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#555',
  },
  skipText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  countdownContainer: {
    backgroundColor: '#222', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  countdownText: { color: '#aaa', fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  imageContainer: { flex: 1 },
  wallpaperImage: { width, height },
  topOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 110,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: {
    backgroundColor: 'rgba(124,58,237,0.4)', paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.5)',
  },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  photographerInfo: { marginBottom: 12 },
  photographerLabel: { color: '#888', fontSize: 12, marginBottom: 2 },
  photographerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  adNotice: {
    backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 10, padding: 10,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  adNoticeText: { color: '#a78bfa', fontSize: 12, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16, gap: 8,
  },
  downloadBtn: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#333' },
  setBtn: { backgroundColor: '#7C3AED' },
  actionIcon: { fontSize: 18 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  helpText: { color: '#555', fontSize: 11, textAlign: 'center' },
});
