import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import colors from '../styles/colors';

export default function SortingToolbar({
    sortOption,
    setSortOption,
    ascending,
    setAscending,
    sortMenuVisible,
    setSortMenuVisible,
    sortTabs,
    onMorePress
}) {
    return (
        <View style={styles.sortingToolbar}>
            <View style={styles.sortTabs}>
                {sortTabs.map(({ key, label }) => (
                    <TouchableOpacity
                        key={key}
                        onPress={() => onMorePress && key === 'more' ? onMorePress() : setSortOption(key)}
                        style={[
                            styles.sortTab,
                            sortOption === key && key !== 'more' && styles.sortTabSelected,
                        ]}
                    >
                        <Text
                            style={[
                                styles.sortTabText,
                                sortOption === key && key !== 'more' && styles.sortTabTextSelected,
                            ]}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity
                onPress={() => setAscending(!ascending)}
                style={styles.iconButton}
                accessibilityLabel="Toggle ascending descending"
                accessibilityHint="Toggles sorting order"
            >
                <MaterialIcons
                    name={ascending ? 'arrow-upward' : 'arrow-downward'}
                    size={24}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    sortingToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    sortTabs: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 6,
        width: 260,
        alignSelf: 'center',
        marginRight: 0,
    },
    sortTab: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginHorizontal: 2,
        borderRadius: 4,
    },
    sortTabSelected: {
        backgroundColor: 'white',
    },
    sortTabText: {
        color: 'black',
        fontSize: 14,
    },
    sortTabTextSelected: {
    },
    iconButton: {
        padding: 6,
        marginLeft: 10,
    },
});