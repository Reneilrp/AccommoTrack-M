import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext.jsx';
import CartService from '../../../services/CartService.js';

export default function CartIcon({ isGuest = false, onAuthRequired }) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [itemCount, setItemCount] = useState(0);

  const fetchCartCount = React.useCallback(async () => {
    if (isGuest) {
      setItemCount(0);
      return;
    }

    const result = await CartService.getCart();
    if (result.success && result.data?.items) {
      setItemCount(result.data.items.length);
    } else {
      setItemCount(0);
    }
  }, [isGuest]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCartCount();
    }, [fetchCartCount])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('accommo:cart-updated', () => {
      fetchCartCount();
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  const handlePress = () => {
    if (isGuest) {
      onAuthRequired?.();
    } else {
      navigation.navigate('Cart');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        position: 'relative',
        padding: 8,
      }}
    >
      <Ionicons name="book-outline" size={24} color="#fff" />
      {itemCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: theme.colors.error,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 10,
              fontWeight: '700',
            }}
          >
            {itemCount > 9 ? '9+' : itemCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
