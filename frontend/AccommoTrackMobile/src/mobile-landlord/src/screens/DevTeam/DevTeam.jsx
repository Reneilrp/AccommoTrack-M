import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Draft from './assets/DraftIcon.jpg';
import { styles } from './DevTeamStyles.js';
import LeadDev from './assets/LeadDeveloper.jpeg';
import PM from './assets/ProjectManager.jpg';
import BA from './assets/BusinessAnalyst.jpg';

export default function DevTeam({ navigation }) {
  const teamMembers = [
    {
      id: 1,
      name: 'Neal Jean Claro',
      role: 'Project Manager',
      image: PM,
      description: 'Coordinates team efforts and ensures timely delivery',
    },
    {
      id: 2,
      name: 'Pheinz Magnun',
      role: 'Lead Developer',
      image: LeadDev,
      description: 'Full-stack developer',
    },
    {
      id: 3,
      name: 'Ar-rauf Imar',
      role: 'UI/UX Designer',
      image: Draft,
      description: 'Creates intuitive and beautiful user experiences',
    },
    {
      id: 4,
      name: 'John Paul Enriquez',
      role: 'Business Analyst',
      image: BA,
      description: 'analyzing an organization systems and processes to identify areas for improvement and increase efficiency and profitability',
    },
    
    {
      id: 5,
      name: 'Rhadzmiel Sali',
      role: 'Quality Assurance',
      image: Draft,
      description: 'creating and executing tests, identifying defects, and ensuring a product or service meets quality standards',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Development Team</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Meet Our Team</Text>
          <Text style={styles.introText}>
            The talented individuals behind AccommoTrack, dedicated to creating the best dormitory management experience.
          </Text>
        </View>

        {teamMembers.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.imageContainer}>
              <Image source={member.image} style={styles.memberImage} />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <View style={styles.roleContainer}>
                <Ionicons name="briefcase-outline" size={16} color="#10b981" />
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
              <Text style={styles.memberDescription}>{member.description}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

