import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../../styles/Menu/HelpSupport.js';
import { useTheme } from '../../../../contexts/ThemeContext';
import homeStyles from '../../../../styles/Tenant/HomePage.js';

export default function HelpSupport() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [message, setMessage] = useState('');

  const faqs = [
    {
      id: 1,
      question: "How do I book an accommodation?",
      answer: "Browse accommodations, select one you like, and click 'View Details'. Then click 'Book Now' to start your reservation."
    },
    {
      id: 2,
      question: "What payment methods are accepted?",
      answer: "We accept credit cards, debit cards, GCash, PayMaya, and bank transfers."
    },
    {
      id: 3,
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking. Cancellation policies vary by property. Check the cancellation policy before booking."
    },
    {
      id: 4,
      question: "How do I contact a landlord?",
      answer: "Go to the accommodation details page and click the 'Message Landlord' button to start a conversation."
    },
    {
      id: 5,
      question: "Is my payment information secure?",
      answer: "Yes, all payment information is encrypted and processed securely through our payment partners."
    }
  ];

  const getContactOptions = () => [
    {
      id: 1,
      icon: 'mail',
      title: 'Email Support',
      subtitle: 'support@accommodtrack.com',
      color: theme.colors.info
    },
    {
      id: 2,
      icon: 'call',
      title: 'Phone Support',
      subtitle: '+63 123 456 7890',
      color: theme.colors.primary
    },
    {
      id: 3,
      icon: 'logo-facebook',
      title: 'Facebook',
      subtitle: '@AccommoTrack',
      color: theme.colors.info
    },
    {
      id: 4,
      icon: 'chatbubbles',
      title: 'Live Chat',
      subtitle: 'Available 24/7',
      color: theme.colors.warning
    }
  ];
  
  const contactOptions = getContactOptions();

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSubmit = () => {
    if (message.trim()) {
      alert('Thank you! Your message has been sent. We\'ll get back to you soon.');
      setMessage('');
    } else {
      alert('Please enter a message.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <StatusBar barStyle="light-content" />
      <View style={[homeStyles.header, { backgroundColor: theme.colors.primary }]}> 
        <View style={homeStyles.headerSide}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>
        <View style={homeStyles.headerCenter}>
          <Text style={[homeStyles.headerTitle, { color: theme.colors.textInverse }]}>Help & Support</Text>
        </View>
        <View style={homeStyles.headerSide} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Ionicons name="help-circle" size={64} color={theme.colors.warning} />
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>How can we help you?</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
            Find answers to common questions or contact our support team
          </Text>
        </View>

        {/* Quick Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {contactOptions.map((option) => (
              <TouchableOpacity 
                key={option.id} 
                style={styles.contactCard}
                onPress={() => console.log('Contact:', option.title)}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqCard}
              onPress={() => toggleFAQ(faq.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a message</Text>
          <View style={styles.messageCard}>
            <TextInput
              style={[styles.messageInput, { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              placeholder="Type your message here..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit}>
              <Ionicons name="send" size={20} color={theme.colors.textInverse} />
              <Text style={[styles.sendButtonText, { color: theme.colors.textInverse }]}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Resources */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <TouchableOpacity style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            <View style={homeStyles.flex1MarginLeft12}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>User Guide</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Learn how to use AccommoTrack</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.info} />
            <View style={homeStyles.flex1MarginLeft12}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>How we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="newspaper" size={24} color={theme.colors.warning} />
            <View style={homeStyles.flex1MarginLeft12}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>Terms of Service</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

