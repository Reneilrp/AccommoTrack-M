import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getStyles } from '../../../../styles/Menu/HelpSupport.js';
import { useTheme } from '../../../../contexts/ThemeContext.jsx';
import Header from '../../components/Header.jsx';
import { showSuccess, showError, showInfo } from '../../../../utils/toast.js';
import { helpService } from '../../../../services/helpService.js';
import { UNIFIED_TERMS_AND_CONDITIONS } from '../../../../shared/LegalContent.js';

export default function HelpSupport() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [message, setMessage] = useState('');
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalType, setLegalType] = useState('terms');
  const supportEmail = 'support@accommotrack.com';
  const supportPhone = '+631234567890';
  const supportFacebookUrl = 'https://www.facebook.com/AccommoTrack';

  useEffect(() => {
    let mounted = true;

    const loadFaqs = async () => {
      setLoadingFaqs(true);
      try {
        const data = await helpService.getFAQs();
        if (mounted) {
          setFaqs(Array.isArray(data) ? data : []);
        }
      } catch (_error) {
        if (mounted) {
          setFaqs([]);
        }
      } finally {
        if (mounted) {
          setLoadingFaqs(false);
        }
      }
    };

    loadFaqs();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const openResource = route.params?.openResource;
    if (openResource !== 'terms' && openResource !== 'privacy') {
      return;
    }

    setLegalType(openResource);
    setShowLegalModal(true);
    navigation.setParams({ openResource: undefined });
  }, [navigation, route.params?.openResource]);

  const getContactOptions = () => [
    {
      id: 1,
      icon: 'mail',
      title: 'Email Support',
      subtitle: 'support@accommotrack.com',
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

  const openExternalLink = async (url, errorText) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('Unsupported link');
      await Linking.openURL(url);
      return true;
    } catch (_error) {
      showError('Action unavailable', errorText);
      return false;
    }
  };

  const handleContactPress = async (option) => {
    switch (option.id) {
      case 1: {
        await openExternalLink(
          `mailto:${supportEmail}?subject=${encodeURIComponent('AccommoTrack Support Request')}`,
          'Unable to open your email app.'
        );
        break;
      }
      case 2: {
        await openExternalLink(`tel:${supportPhone}`, 'Unable to start a phone call on this device.');
        break;
      }
      case 3: {
        await openExternalLink(supportFacebookUrl, 'Unable to open AccommoTrack Facebook page.');
        break;
      }
      case 4: {
        navigation.navigate('Messages');
        break;
      }
      default:
        break;
    }
  };

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      showError('Error', 'Please enter a message.');
      return;
    }

    const opened = await openExternalLink(
      `mailto:${supportEmail}?subject=${encodeURIComponent('AccommoTrack Tenant Concern')}&body=${encodeURIComponent(trimmedMessage)}`,
      'Unable to open your email app.'
    );

    if (opened) {
      showSuccess('Draft Ready', 'Your support message was prepared in your email app.');
      setMessage('');
    }
  };

  const openLegalModal = (type) => {
    setLegalType(type);
    setShowLegalModal(true);
  };

  const handleResourcePress = (resource) => {
    switch (resource) {
      case 'guide':
        showInfo('Guide coming soon', 'User guide content is being prepared.');
        break;
      case 'privacy':
        openLegalModal('privacy');
        break;
      case 'terms':
        openLegalModal('terms');
        break;
      default:
        break;
    }
  };

  const legalSections = React.useMemo(() => {
    if (legalType === 'privacy') {
      return UNIFIED_TERMS_AND_CONDITIONS.sections.filter((section) =>
        /privacy/i.test(section.title)
      );
    }

    return UNIFIED_TERMS_AND_CONDITIONS.sections;
  }, [legalType]);

  const legalTitle = legalType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
  const legalIntro =
    legalType === 'privacy'
      ? 'This policy explains how AccommoTrack collects, stores, and protects personal data.'
      : 'These terms govern the use of AccommoTrack for both tenants and landlords.';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      
      <Header 
        title="Help & Support"
        onBack={() => navigation.goBack()}
        showProfile={false}
      />

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
                onPress={() => handleContactPress(option)}
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
          {loadingFaqs ? (
            <View style={styles.faqCard}>
              <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>Loading FAQs...</Text>
            </View>
          ) : (
            faqs.map((faq, index) => {
              const faqId = faq.id || index;
              return (
                <TouchableOpacity
                  key={faqId}
                  style={styles.faqCard}
                  onPress={() => toggleFAQ(faqId)}
                >
                  <View style={styles.faqHeader}>
                    <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>{faq.question}</Text>
                    <Ionicons
                      name={expandedFAQ === faqId ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                  {expandedFAQ === faqId && (
                    <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>{faq.answer}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
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
          <TouchableOpacity
            style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleResourcePress('guide')}
          >
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            <View style={styles.resourceContent}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>User Guide</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Learn how to use AccommoTrack</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} style={styles.resourceArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleResourcePress('privacy')}
          >
            <Ionicons name="shield-checkmark" size={24} color={theme.colors.info} />
            <View style={styles.resourceContent}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>How we protect your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} style={styles.resourceArrow} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleResourcePress('terms')}
          >
            <Ionicons name="newspaper" size={24} color={theme.colors.warning} />
            <View style={styles.resourceContent}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>Terms & Conditions</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Our terms and conditions</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} style={styles.resourceArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLegalModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLegalModal(false)}
      >
        <View style={[styles.legalModalContainer, { backgroundColor: theme.colors.background }]}> 
          <View style={[styles.legalModalHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}> 
            <View style={styles.legalModalTitleWrap}>
              <Text style={[styles.legalModalTitle, { color: theme.colors.text }]}>{legalTitle}</Text>
              <Text style={[styles.legalModalUpdated, { color: theme.colors.textSecondary }]}>Last Updated: {UNIFIED_TERMS_AND_CONDITIONS.lastUpdated}</Text>
            </View>
            <TouchableOpacity style={styles.legalModalClose} onPress={() => setShowLegalModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.legalModalBody} contentContainerStyle={styles.legalModalBodyContent}>
            <View style={[styles.legalIntroCard, { backgroundColor: `${theme.colors.primary}15`, borderLeftColor: theme.colors.primary }]}> 
              <Text style={[styles.legalIntroText, { color: theme.colors.textSecondary }]}>{legalIntro}</Text>
            </View>

            {legalSections.map((section, index) => (
              <View
                key={`${section.title}-${index}`}
                style={[styles.legalSectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Text style={[styles.legalSectionTitle, { color: theme.colors.text }]}>{section.title}</Text>

                {Array.isArray(section.content) ? (
                  section.content.map((item, itemIndex) => (
                    <View key={`${section.title}-${itemIndex}`} style={styles.legalBulletRow}>
                      <Text style={[styles.legalBulletMark, { color: theme.colors.primary }]}>-</Text>
                      <Text style={[styles.legalBulletText, { color: theme.colors.textSecondary }]}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.legalParagraph, { color: theme.colors.textSecondary }]}>{section.content}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

