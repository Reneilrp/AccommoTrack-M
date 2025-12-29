import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../../styles/Menu/HelpSupport.js';

export default function HelpSupport() {
  const navigation = useNavigation();
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

  const contactOptions = [
    {
      id: 1,
      icon: 'mail',
      title: 'Email Support',
      subtitle: 'support@accommodtrack.com',
      color: '#3B82F6'
    },
    {
      id: 2,
      icon: 'call',
      title: 'Phone Support',
      subtitle: '+63 123 456 7890',
      color: '#10B981'
    },
    {
      id: 3,
      icon: 'logo-facebook',
      title: 'Facebook',
      subtitle: '@AccommoTrack',
      color: '#1877F2'
    },
    {
      id: 4,
      icon: 'chatbubbles',
      title: 'Live Chat',
      subtitle: 'Available 24/7',
      color: '#F59E0B'
    }
  ];

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Ionicons name="help-circle" size={64} color="#F59E0B" />
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeSubtitle}>
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
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#6B7280"
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a message</Text>
          <View style={styles.messageCard}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Resources */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <TouchableOpacity style={styles.resourceCard}>
            <Ionicons name="document-text" size={24} color="#10b981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.resourceTitle}>User Guide</Text>
              <Text style={styles.resourceSubtitle}>Learn how to use AccommoTrack</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <Ionicons name="shield-checkmark" size={24} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.resourceTitle}>Privacy Policy</Text>
              <Text style={styles.resourceSubtitle}>How we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <Ionicons name="newspaper" size={24} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.resourceTitle}>Terms of Service</Text>
              <Text style={styles.resourceSubtitle}>Our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

