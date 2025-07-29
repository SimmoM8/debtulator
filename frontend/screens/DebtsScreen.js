import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LoadingSpinner from '../components/LoadingSpinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/colors';
import typography from '../styles/typography';
import ButtonPrimary from '../components/ButtonPrimary';
import Toolbar from '../components/Toolbar';
import { MaterialIcons } from '@expo/vector-icons';
import SortingToolbar from '../components/SortingToolbar';
import DebtItem from '../components/DebtItem';
import List from '../components/List';
import Dropdown from '../components/Dropdown';
import { sortList, filterList } from '../utils/sortFilterUtils';

export default function HomeScreen() {
    const [debts, setDebts] = useState([]);
    const [rawDebts, setRawDebts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortOption, setSortOption] = useState('who');
    const [ascending, setAscending] = useState(false);
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [filterOption, setFilterOption] = useState('all'); // all, owedByYou, owedToYou
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);
    const navigation = useNavigation();

    const balance = useMemo(() => {
        return rawDebts
            .filter(debt => !debt.paid)
            .reduce((sum, debt) => {
                return sum + (debt.owedBySelf ? -debt.amount : debt.amount);
            }, 0);
    }, [rawDebts]);

    // Load saved preferences on mount
    useEffect(() => {
        async function loadPreferences() {
            try {
                const savedSort = await AsyncStorage.getItem('@sortOption');
                const savedAsc = await AsyncStorage.getItem('@ascending');
                if (savedSort !== null) setSortOption(savedSort);
                if (savedAsc !== null) setAscending(savedAsc === 'true');
            } catch (e) {
                console.log('Failed to load sort preferences:', e);
            }
        }
        loadPreferences();
    }, []);

    // Save preferences when they change
    useEffect(() => {
        async function savePreferences() {
            try {
                await AsyncStorage.setItem('@sortOption', sortOption);
                await AsyncStorage.setItem('@ascending', ascending.toString());
            } catch (e) {
                console.log('Failed to save sort preferences:', e);
            }
        }
        savePreferences();
    }, [sortOption, ascending]);

    const toggleDebtPaidStatus = async (id, currentPaid) => {
        const newPaid = !currentPaid;
        try {
            await fetch(`https://57fa3bd4d410.ngrok-free.app/debts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paid: newPaid }),
            });

            setRawDebts(prev =>
                prev.map(d => d.id === id ? { ...d, paid: newPaid } : d)
            );

            setDebts(prev =>
                prev.map(d => d.id === id ? { ...d, paid: newPaid } : d)
            );
        } catch (err) {
            console.error('Error toggling paid status:', err);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            setLoading(true);
            fetch('https://57fa3bd4d410.ngrok-free.app/debts')
                .then(res => res.json())
                .then(data => {
                    setRawDebts(data); // store unfiltered for balance
                    const sorted = sortList(data, sortOption, ascending, {
                        amount: (a, b) => b.amount - a.amount,
                        date: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                        who: (a, b) => {
                            if (a.owedBySelf === b.owedBySelf) return 0;
                            return a.owedBySelf ? 1 : -1;
                        },
                    });
                    const filtered = filterList(sorted, filterOption, {
                        all: () => true,
                        owedByYou: d => d.owedBySelf,
                        owedToYou: d => !d.owedBySelf,
                    });
                    setDebts(filtered);
                    setError(null);
                })
                .catch(err => setError('Error: ' + err.message))
                .finally(() => setLoading(false));
        }, [sortOption, ascending, filterOption])
    );

    return (
        <>
            <Toolbar>
                <View style={{ flex: 1 }}>
                    <Text style={styles.toolbarTitle}>Debtulator</Text>
                </View>

                <TouchableOpacity
                    onPress={() => setFilterMenuVisible(!filterMenuVisible)}
                    style={styles.iconButton}
                    accessibilityLabel="Open filter options"
                >
                    <MaterialIcons name="filter-list" size={24} color="white" />
                </TouchableOpacity>
            </Toolbar>

            <SortingToolbar
                sortOption={sortOption}
                setSortOption={setSortOption}
                ascending={ascending}
                setAscending={setAscending}
                sortMenuVisible={sortMenuVisible}
                setSortMenuVisible={setSortMenuVisible}
                sortTabs={[
                    { key: 'who', label: 'Who' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'date', label: 'Date' },
                    { key: 'more', label: '...' },
                ]}
                onMorePress={() => setSortMenuVisible(!sortMenuVisible)}
            />

            <Dropdown
                visible={sortMenuVisible}
                options={[
                    { key: 'who', label: 'Who owes who' },
                    { key: 'amount', label: 'Amount' },
                    { key: 'date', label: 'Date' },
                ]}
                selectedKey={sortOption}
                onSelect={setSortOption}
                onClose={() => setSortMenuVisible(false)}
                style={styles.sortDropdown}
            />

            <Dropdown
                visible={filterMenuVisible}
                options={[
                    { key: 'all', label: 'All' },
                    { key: 'owedByYou', label: 'You owe' },
                    { key: 'owedToYou', label: 'Owed to you' },
                ]}
                selectedKey={filterOption}
                onSelect={setFilterOption}
                onClose={() => setFilterMenuVisible(false)}
                style={styles.filterDropdown}
            />

            <View style={styles.container}>
                <View style={styles.balanceContainer}>
                    <MaterialIcons
                        name="account-balance-wallet"
                        size={20}
                        color={
                            balance > 0
                                ? colors.success
                                : balance < 0
                                    ? colors.error
                                    : colors.textPrimary
                        }
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        style={[
                            typography.body,
                            styles.balanceText,
                            {
                                color:
                                    balance > 0
                                        ? colors.success
                                        : balance < 0
                                            ? colors.error
                                            : colors.textPrimary,
                            },
                        ]}
                    >
                        {balance === 0
                            ? 'Congrats! You have no debts owing.'
                            : `Balance: ${balance > 0 ? '+' : ''}${balance} kr`}
                    </Text>
                </View>
                <List
                    data={debts}
                    loading={loading}
                    error={error}
                    emptyMessage="No debts found."
                    renderItem={({ item }) => (
                        <DebtItem
                            debt={item}
                            onTogglePaid={() => toggleDebtPaidStatus(item.id, item.paid)}
                        />
                    )}
                />
                <View style={{ width: '90%' }}>
                    <ButtonPrimary
                        title="Add Debt"
                        onPress={() => navigation.navigate('AddDebt')}
                    />
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        paddingTop: 20, // to avoid overlap with Toolbar
    },
    toggleButton: {
        marginLeft: 10,
        minWidth: 100,
    },
    toolbarTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
        textAlign: 'left',
    },
    iconButton: {
        padding: 6,
        marginLeft: 10,
    },
    pickerWrapper: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        height: Platform.OS === 'ios' ? 33 : 40,
        justifyContent: 'center',
    },
    picker: {
        color: 'white',
        ...Platform.select({
            android: {
                height: 40,
            },
            ios: {
                height: 33,
            },
        }),
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    balanceText: {
        fontWeight: 'bold',
    },
});