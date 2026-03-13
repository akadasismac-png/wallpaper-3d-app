import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Dimensions, StatusBar, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2;

// Free 3D wallpaper images curated from Pexels (no API key needed for direct URLs)
const WALLPAPER_CATEGORIES: Record<string, { id: string; title: string; emoji: string; query: string }> = {
  all: { id: 'all', title: 'All', emoji: '🌟', query: 'abstract 3d' },
  nature: { id: 'nature', title: 'Nature', emoji: '🌿', query: '3d nature landscape' },
  space: { id: 'space', title: 'Space', emoji: '🚀', query: '3d space galaxy' },
  abstract: { id: 'abstract', title: 'Abstract', emoji: '🎨', query: '3d abstract art' },
  dark: { id: 'dark', title: 'Dark', emoji: '🌑', query: '3d dark wallpaper' },
  neon: { id: 'neon', title: 'Neon', emoji: '💡', query: '3d neon glow' },
  minimal: { id: 'minimal', title: 'Minimal', emoji: '⬜', query: '3d minimal design' },
};

const PEXELS_API_KEY = 'MiY4j7h7l8cjbQbWYc5NQTC4AXnP4bT2MBg3xBOVJM00oTCkHLhUhOe2';

interface WallpaperItem {
  id: string;
  src: { portrait: string; large2x: string };
  photographer: string;
  avg_color: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchWallpapers = useCallback(async (category = 'all', searchQuery = '', pageNum = 1) => {
    try {
      const query = searchQuery || WALLPAPER_CATEGORIES[category]?.query || '3d wallpaper';
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&page=${pageNum}&orientation=portrait`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      const data = await res.json();
      if (pageNum === 1) {
        setWallpapers(data.photos || []);
      } else {
        setWallpapers(prev => [...prev, ...(data.photos || [])]);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchWallpapers(selectedCategory, search, 1);
  }, [selectedCategory, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchWallpapers(selectedCategory, search, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchWallpapers(selectedCategory, search, nextPage);
  };

  const openPreview = (item: WallpaperItem) => {
    router.push({
      pathname: '/preview',
      params: {
        imageUrl: item.src.large2x,
        previewUrl: item.src.portrait,
        photographer: item.photographer,
        color: item.avg_color || '#111',
        id: item.id,
      },
    });
  };

  const renderItem = ({ item }: { item: WallpaperItem }) => (
    <TouchableOpacity style={styles.item} onPress={() => openPreview(item)} activeOpacity={0.85}>
      <Image source={{ uri: item.src.portrait }} style={styles.itemImage} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.itemGradient}>
        <Text style={styles.itemPhotographer} numberOfLines={1}>📸 {item.photographer}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>3D WallPapers</Text>
          <Text style={styles.headerSub}>HD & 4K Wallpapers</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search wallpapers..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {Object.values(WALLPAPER_CATEGORIES).map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryBtn, selectedCategory === cat.id && styles.categoryBtnActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
              {cat.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading wallpapers...</Text>
        </View>
      ) : (
        <FlatList
          data={wallpapers}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />
          }
          ListFooterComponent={<ActivityIndicator color="#7C3AED" style={{ margin: 16 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#666', marginTop: 2 },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: '#7C3AED33',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 5 },
  liveText: { color: '#22c55e', fontWeight: '700', fontSize: 11 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, height: 44, color: '#fff', fontSize: 15 },
  clearBtn: { color: '#555', fontSize: 16, padding: 4 },
  categoriesScroll: { maxHeight: 56 },
  categoriesContent: { paddingHorizontal: 12, paddingBottom: 8 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginHorizontal: 4,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  categoryBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  categoryEmoji: { fontSize: 14, marginRight: 5 },
  categoryText: { color: '#888', fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },
  grid: { padding: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  item: { width: ITEM_WIDTH, height: ITEM_WIDTH * 1.6, borderRadius: 16, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, justifyContent: 'flex-end', padding: 8 },
  itemPhotographer: { color: '#ddd', fontSize: 10, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
});
