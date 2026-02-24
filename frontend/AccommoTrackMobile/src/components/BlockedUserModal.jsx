import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const BlockedUserModal = ({ visible, onClose }) => {
  const navigation = useNavigation();

  const handleContactSupport = () => {
    onClose();
    // I will assume the help screen is called 'Help'.
    // If not, I will need to find the correct screen name.
    navigation.navigate('Help');
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 25, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
            <Ionicons name="shield-half-outline" size={45} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 10, textAlign: 'center' }}>Account Blocked</Text>
          <Text style={{ fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 25, lineHeight: 24 }}>
            Your account has been blocked by the administrator. Please contact support for assistance.
          </Text>

          <View style={{ width: '100%', gap: 12 }}>
            <TouchableOpacity 
              onPress={handleContactSupport}
              style={{ backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
            >
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Contact Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={onClose}
              style={{ backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 12, width: '100%' }}
            >
              <Text style={{ color: '#4B5563', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BlockedUserModal;
