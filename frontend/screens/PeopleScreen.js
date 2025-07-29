import React, { useState, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import List from '../components/List';
import ButtonPrimary from '../components/ButtonPrimary';
import PersonItem from '../components/PersonItem';
import typography from '../styles/typography';
import colors from '../styles/colors';

export default function PeopleScreen() {
  const [people, setPeople] = useState([]);
  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      fetch('https://57fa3bd4d410.ngrok-free.app/people')
        .then(res => res.json())
        .then(data => setPeople(data))
        .catch(err => {
          console.error('Error fetching people:', err);
        });
    }, [])
  );

  const renderPerson = ({ item }) => <PersonItem person={item} />;

  return (
    <View style={styles.container}>
      <List
        data={people}
        renderItem={renderPerson}
        emptyMessage="No people added yet."
      />
      <View style={styles.addButtonContainer}>
        <ButtonPrimary
          title="Add Person"
          onPress={() => navigation.navigate('AddPersonScreen')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.background,
  },
  addButtonContainer: {
    marginTop: 12,
    width: '90%',
    alignSelf: 'center',
  },
});
