import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import ButtonPrimary from '../components/ButtonPrimary';
import colors from '../styles/colors';
import typography from '../styles/typography';

export default function AddPersonScreen({ navigation }) {
    const [name, setName] = useState('');

    const handleAddPerson = async () => {
        if (!name.trim()) {
            Alert.alert('Please enter a name');
            return;
        }

        try {
            const response = await fetch('https://57fa3bd4d410.ngrok-free.app/people', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to add person');
            }

            const result = await response.json();
            console.log('Person added:', result);
            setName('');
            navigation.goBack();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Could not add person. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[typography.body, styles.label]}>Person's Name</Text>
            <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.buttonContainer}>
                <ButtonPrimary title="Add Person" onPress={handleAddPerson} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1,
        backgroundColor: colors.background,
    },
    label: {
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        borderRadius: 4,
        color: colors.textPrimary,
        backgroundColor: '#fff',
    },
    buttonContainer: {
        marginTop: 20,
    },
});
