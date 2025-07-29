import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '../styles/colors';

export default function ButtonPrimary({ title, onPress }) {
    return (
        <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginVertical: 10,
    },
    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
});