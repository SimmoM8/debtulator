import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import colors from '../styles/colors';
import typography from '../styles/typography';

export default function Dropdown({
    visible,
    options = [],
    selectedKey,
    onSelect,
    onClose,
    style,
}) {
    if (!visible) return null;

    return (
        <>
            {/* Full-screen transparent overlay */}
            <Pressable
                style={styles.overlay}
                onPress={onClose}
                accessible={false}
            />
            <View style={[styles.dropdown, style]}>
                {options.map(({ key, label }) => (
                    <Pressable
                        key={key}
                        onPress={() => {
                            onSelect(key);
                            onClose?.();
                        }}
                        style={styles.option}
                    >
                        <Text
                            style={[
                                typography.body,
                                styles.optionText,
                                selectedKey === key && styles.selectedOption,
                            ]}
                        >
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: 'transparent',
        zIndex: 999,
    },
    dropdown: {
        position: 'absolute',
        backgroundColor: colors.background,
        borderRadius: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 1000,
        width: 160,
        top: 56,
        right: 0,
    },
    option: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    optionText: {
        color: colors.textPrimary,
    },
    selectedOption: {
        fontWeight: 'bold',
    },
});