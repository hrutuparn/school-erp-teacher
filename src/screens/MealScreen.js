import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { supabase } from '../services/supabase';
import colors from '../components/colors';

export default function MealScreen({ onBack, className = "10A" }) {
  const [meal, setMeal] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Allergens configuration mapping
  const allergensList = [
    { id: 'peanuts', label: '🥜 Peanuts / Groundnuts' },
    { id: 'milk', label: '🥛 Milk / Dairy' },
    { id: 'wheat', label: '🌾 Wheat / Gluten' },
    { id: 'egg', label: '🥚 Egg' },
    { id: 'soy', label: '🫘 Soybeans' },
    { id: 'nuts', label: '🌰 Tree Nuts' }
  ];

  // Mock allergies mapping for demonstration (if table lacks allergies column)
  const getStudentAllergies = (student) => {
    if (student.allergies) return student.allergies;
    const mockMap = {
      '2': 'milk, peanuts',
      '4': 'egg',
      '5': 'peanuts',
      '8': 'wheat',
    };
    return mockMap[student.id.toString()] || '';
  };

  useEffect(() => {
    fetchMealAndStudents();
  }, []);

  async function fetchMealAndStudents() {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // 1. Fetch Today's Meal (school-wide)
      const { data: mealData, error: mealError } = await supabase
        .from('midday_meal')
        .select('*')
        .eq('date', todayStr)
        .limit(1);

      if (!mealError && mealData && mealData.length > 0) {
        setMeal(mealData[0]);
      } else {
        setMeal(null);
      }

      // 2. Fetch Students
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('class', className)
        .order('roll_number', { ascending: true });

      if (studentError) throw studentError;
      setStudents(studentData || []);

    } catch (error) {
      console.log('Error loading meal details:', error.message);
      Alert.alert('Error', 'Failed to retrieve meal logs');
    } finally {
      setLoading(false);
    }
  }

  const checkAllergyAlert = (studentAllergiesString) => {
    if (!studentAllergiesString || !meal || !meal.allergens) return [];
    const studentAllergies = studentAllergiesString.split(',').map(a => a.trim().toLowerCase());
    const menuAllergens = meal.allergens.split(',').map(a => a.trim().toLowerCase());
    return menuAllergens.filter(allergen => studentAllergies.includes(allergen));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.teal} />
          <Text style={{ marginTop: 15, color: colors.gray }}>Loading Mid-Day Meal Menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeAllergens = meal && meal.allergens ? meal.allergens.split(',').map(s => s.trim()) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🍱 Mid-Day Meal Alert</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentContainer}>
        
        {/* Menu Status Card */}
        {!meal ? (
          <View style={styles.menuSetupPrompt}>
            <Text style={styles.alertEmoji}>🍲</Text>
            <Text style={styles.promptTitle}>No Menu Logged for Today</Text>
            <Text style={styles.promptSub}>
              The school principal hasn't logged today's mid-day meal menu yet. Check back later!
            </Text>
          </View>
        ) : (
          <View style={styles.mealMenuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderTitle}>🍽️ Today's Lunch Menu</Text>
              <Text style={styles.dateBadge}>{meal.date}</Text>
            </View>
            <Text style={styles.menuDescription}>{meal.menu_items}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.allergenListTitle}>Allergens Present today:</Text>
            <View style={styles.allergenChipsRow}>
              {activeAllergens.length > 0 ? (
                activeAllergens.map((alg) => (
                  <View key={alg} style={styles.allergenChip}>
                    <Text style={styles.allergenChipText}>
                      {allergensList.find(a => a.id === alg.toLowerCase())?.label || alg}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noAllergenText}>✅ No allergens listed by administration</Text>
              )}
            </View>
          </View>
        )}

        {/* Student Allergy Safety Card */}
        <View style={styles.rosterCard}>
          <Text style={styles.sectionHeader}>🧑‍🎓 Class {className} Safety List</Text>
          <Text style={styles.helperText}>
            Roster of students with registered dietary allergies. Alerts turn red if food contains ingredients they are allergic to.
          </Text>

          {students.map((student) => {
            const studentAllergyText = getStudentAllergies(student);
            const activeTriggers = checkAllergyAlert(studentAllergyText);
            const hasCriticalAlert = activeTriggers.length > 0;

            return (
              <View 
                key={student.id} 
                style={[
                  styles.studentRow, 
                  hasCriticalAlert && styles.studentRowAlert
                ]}
              >
                <View style={styles.studentMeta}>
                  <Text style={styles.studentName}>
                    {student.first_name} {student.last_name}
                  </Text>
                  <Text style={styles.studentSub}>Roll No: {student.roll_number}</Text>
                  
                  {studentAllergyText ? (
                    <Text style={styles.allergyText}>
                      Allergies: <Text style={styles.allergyHighlight}>{studentAllergyText}</Text>
                    </Text>
                  ) : (
                    <Text style={styles.allergyTextClean}>No known allergies</Text>
                  )}
                </View>

                {hasCriticalAlert && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>
                      ⚠️ ALERT: {activeTriggers.map(t => t.toUpperCase()).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  contentContainer: {
    flex: 1,
    padding: 15,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuSetupPrompt: {
    backgroundColor: colors.white,
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  promptSub: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  mealMenuCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateBadge: {
    fontSize: 12,
    color: colors.teal,
    fontWeight: 'bold',
    backgroundColor: colors.teal + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginVertical: 12,
  },
  allergenListTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  allergenChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergenChip: {
    backgroundColor: '#E74C3C15',
    borderWidth: 1,
    borderColor: '#E74C3C50',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 6,
    marginBottom: 6,
  },
  allergenChipText: {
    fontSize: 11,
    color: '#E74C3C',
    fontWeight: '600',
  },
  noAllergenText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '600',
  },
  rosterCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 15,
    lineHeight: 18,
  },
  studentRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentRowAlert: {
    backgroundColor: '#E74C3C08',
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C40',
    marginVertical: 4,
  },
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  studentSub: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  allergyText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  allergyHighlight: {
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  allergyTextClean: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 4,
    fontStyle: 'italic',
  },
  alertBadge: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  alertBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
