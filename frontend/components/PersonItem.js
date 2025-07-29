

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import typography from '../styles/typography';
import colors from '../styles/colors';

export default function PersonItem({ person }) {
    return (
        <View style={styles.container}>
            <Text style={typography.body}>{person.name}</Text>
            <Text
                style={[
                    styles.netText,
                    {
                        color:
                            person.netOwed > 0
                                ? colors.success
                                : person.netOwed < 0
                                    ? colors.error
                                    : colors.textSecondary,
                    },
                ]}
            >
                {person.netOwed > 0 ? '+' : ''}
                {person.netOwed} kr
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    netText: {
        fontWeight: 'bold',
    },
});