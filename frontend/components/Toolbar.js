import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Toolbar({ children }) {
    return <View style={styles.toolbar}>{children}</View>;
}

const styles = StyleSheet.create({
    toolbar: {
        height: 56,
        backgroundColor: '#a94242',  // use your primary color
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        elevation: 4, // shadow for android
        shadowColor: '#000', // shadow for ios
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        justifyContent: 'flex-end',
    },
});