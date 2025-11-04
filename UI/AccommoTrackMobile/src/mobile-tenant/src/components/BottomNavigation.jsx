import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Tenant/TenantHomePage.js';

export default function BottomNavigation({ activeTab, onTabPress }) {
  const navigation = useNavigation();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleTabPress = (tab) => {
    // Prevent multiple rapid clicks
    if (isNavigating) return;
    
    onTabPress(tab);
    setIsNavigating(true);
    
    // 1 second delay before navigation
    setTimeout(() => {
      switch(tab) {
        case 'home':
          if (activeTab !== 'home') {
            navigation.navigate('TenantHome');
          }
          break;
        case 'messages':
          if (activeTab !== 'messages') {
            navigation.navigate('Messages');
          }
          break;
        case 'settings':
          if (activeTab !== 'settings') {
            navigation.navigate('Settings');
            console.log('Settings pressed');
          }
          break;
        default:
          break;
      }
      setIsNavigating(false);
    },);
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('home')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'home' ? '#FDD835' : 'white'}
        />
        {activeTab === 'home' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('messages')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'messages' ? 'chatbubble' : 'chatbubble-outline'}
          size={24}
          color={activeTab === 'messages' ? '#FDD835' : 'white'}
        />
        {activeTab === 'messages' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => handleTabPress('settings')}
        disabled={isNavigating}
      >
        <Ionicons
          name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
          size={24}
          color={activeTab === 'settings' ? '#FDD835' : 'white'}
        />
        {activeTab === 'settings' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    </View>
  );
}