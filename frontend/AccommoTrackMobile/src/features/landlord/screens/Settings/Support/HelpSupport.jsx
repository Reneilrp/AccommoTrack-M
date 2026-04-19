import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getStyles } from '../../../../../styles/Menu/HelpSupport.js';
import { useTheme } from '../../../../../contexts/ThemeContext.jsx';
import Header from '../../../components/Header.jsx';
import { showSuccess, showError, showInfo } from '../../../../../utils/toast.js';
import { UNIFIED_TERMS_AND_CONDITIONS } from '../../../../../shared/LegalContent.js';

const LANDLORD_FAQS = [
  {
    id: 'landlord-faq-1',
    question: 'How do I verify my landlord account?',
    answer: 'Go to Settings > Verification Status and submit your valid ID plus business permit. Our team reviews submissions as quickly as possible.',
  },
  {
    id: 'landlord-faq-2',
    question: 'How can I reduce failed or delayed rent collections?',
    answer: 'Enable both online and manual methods in your payment settings, and keep reminder notifications on for due and overdue invoices.',
  },
  {
    id: 'landlord-faq-3',
    question: 'Where can I monitor booking and occupancy performance?',
    answer: 'Open Analytics for trends, and use Dashboard cards for upcoming checkouts, vacating notices, and billing health snapshots.',
  },
  {
    id: 'landlord-faq-4',
    question: 'How do I report a technical issue?',
    answer: 'Open Report a Problem and send details like affected module, exact steps, expected result, and actual result.',
  },
];

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);

  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [message, setMessage] = useState('');
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalType, setLegalType] = useState('terms');
  const scrollRef = useRef(null);

  const supportEmail = 'support@accommotrack.com';
  const supportPhone = '+631234567890';
  const supportFacebookUrl = 'https://www.facebook.com/AccommoTrack';

  useEffect(() => {
    const openResource = route.params?.openResource;
    if (openResource !== 'terms' && openResource !== 'privacy' && openResource !== 'report') {
      return;
    }

    handleResourcePress(openResource);
    navigation.setParams({ openResource: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, route.params?.openResource]);

  const contactOptions = [
    {
      id: 1,
      icon: 'mail',
      title: 'Email Support',
      subtitle: 'support@accommotrack.com',
      color: theme.colors.info,
    },
    {
      id: 2,
      icon: 'call',
      title: 'Phone Support',
      subtitle: '+63 123 456 7890',
      color: theme.colors.primary,
    },
    {
      id: 3,
      icon: 'logo-facebook',
      title: 'Facebook',
      subtitle: '@AccommoTrack',
      color: theme.colors.info,
    },
    {
      id: 4,
      icon: 'chatbubbles',
      title: 'Live Chat',
      subtitle: 'Open landlord messages',
      color: theme.colors.warning,
    },
  ];

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
      case 1:
        await openExternalLink(
          `mailto:${supportEmail}?subject=${encodeURIComponent('AccommoTrack Landlord Support Request')}`,
          'Unable to open your email app.',
        );
        break;
      case 2:
        await openExternalLink(`tel:${supportPhone}`, 'Unable to start a phone call on this device.');
        break;
      case 3:
        await openExternalLink(supportFacebookUrl, 'Unable to open AccommoTrack Facebook page.');
        break;
      case 4:
        navigation.navigate('Messages');
        break;
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
      `mailto:${supportEmail}?subject=${encodeURIComponent('AccommoTrack Landlord Concern')}&body=${encodeURIComponent(trimmedMessage)}`,
      'Unable to open your email app.',
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
        showInfo('Guide coming soon', 'Landlord guide content is being prepared.');
        break;
      case 'report':
        setMessage((previous) => previous || 'Issue type:\nModule:\nSteps to reproduce:\nExpected result:\nActual result:\nAttachments (if any):');
        showInfo('Report template ready', 'Complete the details, then tap Send Message.');
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
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
      return UNIFIED_TERMS_AND_CONDITIONS.sections.filter((section) => /privacy/i.test(section.title));
    }

    return UNIFIED_TERMS_AND_CONDITIONS.sections.filter((section) => !/tenant responsibilities/i.test(section.title));
  }, [legalType]);

  const legalTitle = legalType === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
  const legalIntro =
    legalType === 'privacy'
      ? 'This policy explains how AccommoTrack handles landlord and property-related data securely.'
      : 'These terms cover landlord responsibilities for listings, operations, and payments on AccommoTrack.';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <Header
        title="Help & Support"
        onBack={() => navigation.goBack()}
      />

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Ionicons name="help-circle" size={64} color={theme.colors.warning} />
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>How can we help you?</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>Landlord support for operations, billing, listings, and verification.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {contactOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.contactCard}
                onPress={() => handleContactPress(option)}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: `${option.color}20` }]}>
                  <Ionicons name={option.icon} size={28} color={option.color} />
                </View>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {LANDLORD_FAQS.map((faq) => (
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a message</Text>
          <View style={styles.messageCard}>
            <TextInput
              style={[
                styles.messageInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
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

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <TouchableOpacity
            style={[styles.resourceCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleResourcePress('report')}
          >
            <Ionicons name="flag" size={24} color={theme.colors.error} />
            <View style={styles.resourceContent}>
              <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>Report a Problem</Text>
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Send technical or billing issue details</Text>
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
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>Landlord platform terms and obligations</Text>
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
              <Text style={[styles.resourceSubtitle, { color: theme.colors.textSecondary }]}>How landlord and tenant data is protected</Text>
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