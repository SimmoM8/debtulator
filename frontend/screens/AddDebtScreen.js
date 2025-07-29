import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '../styles/colors';
import typography from '../styles/typography';
import ButtonPrimary from '../components/ButtonPrimary';
import DropDownPicker from 'react-native-dropdown-picker';

export default function AddDebtScreen() {
    const navigation = useNavigation();
    const [selectedPersonId, setSelectedPersonId] = useState('');
    const [newPersonName, setNewPersonName] = useState('');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [owedBySelf, setOwedBySelf] = useState(true);
    const [people, setPeople] = useState([]);
    const [open, setOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        fetchPeople();
    }, []);

    const fetchPeople = async () => {
        try {
            const res = await fetch('https://57fa3bd4d410.ngrok-free.app/people');
            const data = await res.json();
            setPeople(data);
        } catch (error) {
            console.error('Failed to fetch people:', error);
        }
    };

    // Options for the Dropdown: include a default "Select a person" option
    const dropdownOptions = [
        { key: '', label: 'Select a person' },
        ...people.map(p => ({ key: p.id.toString(), label: p.name })),
    ];

    const handleSelectPerson = (key) => {
        setSelectedPersonId(key);
        setShowDropdown(false);
        if (key) {
            setNewPersonName('');
        }
    };

    const addPerson = async (name) => {
        try {
            const res = await fetch('https://57fa3bd4d410.ngrok-free.app/people', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                throw new Error('Failed to add person');
            }
            const newPerson = await res.json();
            setPeople(prev => [...prev, newPerson]);
            return newPerson.name;
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not add person');
            throw error;
        }
    };

    const handleSubmit = async () => {
        let personName = '';

        if (selectedPersonId) {
            // Use existing person name
            const selected = people.find(p => p.id.toString() === selectedPersonId);
            if (!selected) {
                Alert.alert('Invalid selection', 'Selected person not found.');
                return;
            }
            personName = selected.name;
        } else {
            // Use new person name
            if (!newPersonName.trim()) {
                Alert.alert('Missing information', 'Please select or enter a person name.');
                return;
            }
            try {
                personName = await addPerson(newPersonName.trim());
            } catch {
                return;
            }
        }

        if (!amount.trim()) {
            Alert.alert('Missing information', 'Please enter an amount.');
            return;
        }

        try {
            const response = await fetch('https://57fa3bd4d410.ngrok-free.app/debts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    person: personName,
                    amount: parseFloat(amount),
                    reason,
                    owedBySelf,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add debt');
            }

            setSelectedPersonId('');
            setNewPersonName('');
            setAmount('');
            setReason('');
            setSuccessMessage('Debt added successfully.');
            setTimeout(() => {
                setSuccessMessage('');
                navigation.goBack();
            }, 3000);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[typography.heading, styles.label]}>Select a person</Text>
            <DropDownPicker
                open={open}
                setOpen={setOpen}
                value={selectedPersonId}
                setValue={setSelectedPersonId}
                items={dropdownOptions.map(option => ({
                    label: option.label,
                    value: option.key,
                }))}
                placeholder="Select a person"
                style={styles.picker}
                dropDownContainerStyle={styles.pickerDropdown}
                zIndex={1000}
            />

            {selectedPersonId ? (
                <Text style={[typography.body, styles.infoText]}>
                    Adding debt with {people.find(p => p.id.toString() === selectedPersonId)?.name}
                </Text>
            ) : (
                <>
                    <Text style={[typography.heading, styles.label, { marginTop: 10 }]}>
                        Or add a new person here
                    </Text>
                    <TextInput
                        style={[styles.input, typography.body]}
                        placeholder="New person name"
                        placeholderTextColor={colors.placeholder}
                        value={newPersonName}
                        onChangeText={setNewPersonName}
                        autoCorrect={false}
                        autoCapitalize="words"
                    />
                </>
            )}

            <Text style={[typography.heading, styles.label, { marginTop: 15 }]}>How much?</Text>
            <TextInput
                style={[styles.input, typography.body]}
                placeholder="Amount"
                placeholderTextColor={colors.placeholder}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            <Text style={[typography.heading, styles.label]}>Reason (optional)</Text>
            <TextInput
                style={[styles.input, typography.body]}
                placeholder="E.g. dinner"
                placeholderTextColor={colors.placeholder}
                value={reason}
                onChangeText={setReason}
            />

            <View style={styles.toggleContainer}>
                <Text style={[typography.heading, styles.label]}>Who owes?</Text>
                <View style={styles.toggleButtons}>
                    <ButtonPrimary
                        title="I Owe"
                        onPress={() => setOwedBySelf(true)}
                        style={owedBySelf ? styles.activeToggleButton : styles.inactiveToggleButton}
                        textStyle={owedBySelf ? styles.activeToggleButtonText : styles.inactiveToggleButtonText}
                    />
                    <ButtonPrimary
                        title="They Owe Me"
                        onPress={() => setOwedBySelf(false)}
                        style={!owedBySelf ? styles.activeToggleButton : styles.inactiveToggleButton}
                        textStyle={!owedBySelf ? styles.activeToggleButtonText : styles.inactiveToggleButtonText}
                    />
                </View>
            </View>

            <ButtonPrimary title="Add Debt" onPress={handleSubmit} />
            {successMessage ? <Text style={[typography.body, styles.success]}>{successMessage}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        flex: 1,
        backgroundColor: colors.background,
    },
    label: {
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        padding: 10,
        borderRadius: 5,
        color: colors.text,
        backgroundColor: colors.inputBackground,
    },
    picker: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 5,
        backgroundColor: colors.inputBackground,
        marginBottom: 10,
        zIndex: 1000,
    },
    pickerDropdown: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
        zIndex: 999,
    },
    success: {
        marginTop: 20,
        color: colors.success,
        textAlign: 'center',
        fontSize: 16,
    },
    toggleContainer: {
        marginTop: 20,
    },
    toggleButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    activeToggleButton: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: colors.primary,
    },
    inactiveToggleButton: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: colors.inactive,
    },
    activeToggleButtonText: {
        color: colors.buttonTextActive,
    },
    inactiveToggleButtonText: {
        color: colors.buttonTextInactive,
    },
    infoText: {
        marginTop: 10,
        marginBottom: 10,
        color: colors.text,
    },
});