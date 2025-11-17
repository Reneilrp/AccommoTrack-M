import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../../styles/Tenant/MessagesPage.js';
import BottomNavigation from '../components/BottomNavigation.jsx';
import { featuredAccommodation } from '../TenantHomePage/Data/AccommodationData.js';

export default function MessagesPage() {
    const [selectedChat, setSelectedChat] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [activeNavTab, setActiveNavTab] = useState('messages');

    // Generate conversations from accommodation data
    const conversations = featuredAccommodation.map((accommodation, index) => ({
        id: accommodation.id,
        landlordName: `${accommodation.name}`,
        propertyName: accommodation.name,
        propertyType: accommodation.type,
        lastMessage: index === 0 ? "Yes, you can visit tomorrow at 2 PM" : 
                     index === 1 ? `The monthly rent is ₱${accommodation.price.toLocaleString()}` : 
                     "Thank you for your interest!",
        timestamp: index === 0 ? "2:30 PM" : index === 1 ? "Yesterday" : "Monday",
        unreadCount: index === 0 ? 2 : 0,
        online: index !== 1,
        location: accommodation.location,
        price: accommodation.price,
    }));

    // Sample messages for selected chat
    const messages = selectedChat ? [
        {
            id: 1,
            senderId: 2,
            text: `Hello! I'm interested in ${selectedChat.propertyName}.`,
            timestamp: "10:00 AM",
            isMe: true
        },
        {
            id: 2,
            senderId: 1,
            text: "Hi! Thank you for reaching out. What would you like to know?",
            timestamp: "10:05 AM",
            isMe: false
        },
        {
            id: 3,
            senderId: 2,
            text: "What's the monthly rent and can I schedule a visit?",
            timestamp: "10:10 AM",
            isMe: true
        },
        {
            id: 4,
            senderId: 1,
            text: `The rent is ₱${selectedChat.price.toLocaleString()}/month. It's located at ${selectedChat.location}. You can visit tomorrow at 2 PM.`,
            timestamp: "2:30 PM",
            isMe: false
        }
    ] : [];

    const handleSendMessage = () => {
        if (messageText.trim()) {
            console.log('Sending message:', messageText);
            setMessageText('');
        }
    };

    const renderChatList = () => (
        <View style={styles.wrapper}>
            <View style={styles.contentContainer}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="search" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Chat List */}
                <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
                    {conversations.map((chat) => (
                        <TouchableOpacity
                            key={chat.id}
                            style={styles.chatItem}
                            onPress={() => setSelectedChat(chat)}
                        >
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatarIconWrapper}>
                                    <Ionicons name="person-circle" size={56} color="#4CAF50" />
                                </View>
                                {chat.online && <View style={styles.onlineIndicator} />}
                            </View>

                            <View style={styles.chatInfo}>
                                <View style={styles.chatHeader}>
                                    <Text style={styles.landlordName}>{chat.landlordName}</Text>
                                    <Text style={styles.timestamp}>{chat.timestamp}</Text>
                                </View>
                                <View style={styles.propertyInfo}>
                                    <Text style={styles.propertyName}>{chat.propertyName}</Text>
                                    <Text style={styles.propertyType}> • {chat.propertyType}</Text>
                                </View>
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    {chat.lastMessage}
                                </Text>
                            </View>

                            {chat.unreadCount > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Static Bottom Navigation */}
            <BottomNavigation
                activeTab={activeNavTab}
                onTabPress={setActiveNavTab}
            />
        </View>
    );

    const renderChatScreen = () => (
        <KeyboardAvoidingView
            style={styles.wrapper}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle="light-content" />

            {/* Chat Header */}
            <View style={styles.chatHeader}>
                <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.chatHeaderInfo}>
                    <View style={styles.headerAvatarIconWrapper}>
                        <Ionicons name="person-circle" size={40} color="#FFFFFF" />
                    </View>
                    <View>
                        <Text style={styles.chatHeaderName}>{selectedChat.landlordName}</Text>
                        <Text style={styles.chatHeaderProperty}>{selectedChat.propertyName}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.headerIcon}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
                {/* Property Info Card */}
                <View style={styles.propertyCard}>
                    <Text style={styles.propertyCardTitle}>{selectedChat.propertyName}</Text>
                    <Text style={styles.propertyCardType}>{selectedChat.propertyType}</Text>
                    <Text style={styles.propertyCardLocation}>
                        <Ionicons name="location" size={14} color="#6B7280" /> {selectedChat.location}
                    </Text>
                    <Text style={styles.propertyCardPrice}>₱{selectedChat.price.toLocaleString()}/month</Text>
                </View>

                {messages.map((message) => (
                    <View
                        key={message.id}
                        style={[
                            styles.messageWrapper,
                            message.isMe ? styles.myMessageWrapper : styles.theirMessageWrapper
                        ]}
                    >
                        <View
                            style={[
                                styles.messageBubble,
                                message.isMe ? styles.myMessageBubble : styles.theirMessageBubble
                            ]}
                        >
                            <Text
                                style={[
                                    styles.messageText,
                                    message.isMe ? styles.myMessageText : styles.theirMessageText
                                ]}
                            >
                                {message.text}
                            </Text>
                            
                        </View>
                        <Text
                                style={[
                                    styles.messageTime,
                                    message.isMe ? styles.myMessageTime : styles.theirMessageTime
                                ]}
                            >
                                {message.timestamp}
                            </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <TouchableOpacity style={styles.attachButton}>
                    <Ionicons name="add-circle" size={28} color="#4CAF50" />
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                />

                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Ionicons name="send" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    return (
        <SafeAreaView style={styles.container} edges={[ 'top']}>
            {selectedChat ? renderChatScreen() : renderChatList()}
        </SafeAreaView>
    );
}