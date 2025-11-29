import  { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Landlord/Messages.js';
import Button from '../components/ui/Button';

export default function MessagesScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');

  const [conversations] = useState([
    {
      id: 1,
      name: 'Pheinz Magnun',
      room: '101',
      lastMessage: 'Thank you for fixing the AC!',
      time: '10:30 AM',
      unread: 2,
      online: true
    },
    {
      id: 2,
      name: 'Jean Claro',
      room: '102',
      lastMessage: 'When is the rent due?',
      time: 'Yesterday',
      unread: 0,
      online: false
    },
    {
      id: 3,
      name: 'JP Enriquez',
      room: '102',
      lastMessage: 'Can I have guests this weekend?',
      time: '2 days ago',
      unread: 1,
      online: true
    },
    {
      id: 4,
      name: 'Rhadzmiel Sali',
      room: '201',
      lastMessage: 'The WiFi is not working',
      time: '3 days ago',
      unread: 0,
      online: false
    }
  ]);

  const filteredConversations = conversations.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.room.includes(searchQuery)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />

      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => navigation.goBack()} type="transparent" style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Button>
        <Text style={styles.headerTitle}>Messages</Text>
        <Button type="transparent" style={{ padding: 6 }}>
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
        </Button>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversations List */}
      <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
        {filteredConversations.map((chat) => (
          <Button
            key={chat.id}
            style={styles.chatItem}
            onPress={() => navigation.navigate('Chat', { chat })}
            type="transparent"
          >
            <View style={styles.chatAvatarContainer}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatInitials}>
                  {chat.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              {chat.online && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <View>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatRoom}>Room {chat.room}</Text>
                </View>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              <Text style={styles.chatMessage} numberOfLines={1}>
                {chat.lastMessage}
              </Text>
            </View>

            {chat.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{chat.unread}</Text>
              </View>
            )}
          </Button>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

