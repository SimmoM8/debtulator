import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Card, PageHeader, Screen, SectionTitle, SelectChips } from '@/src/components/ui/Primitives';
import { palette } from '@/src/constants/design';
import { formatLocaleCurrency, formatLocaleDate, t } from '@/src/services/i18n';
import { useAppData } from '@/src/state/AppDataProvider';

export function LanguageSettingsScreen() {
  const data = useAppData();

  return (
    <Screen>
      <PageHeader eyebrow="Localization" title="Language" subtitle="Display strings, dates, and currency formatting can follow system language or be pinned." />
      <Card>
        <SectionTitle title="App language" />
        <SelectChips
          value={data.settings.language}
          onChange={(language) => data.updateSettings({ language })}
          options={[
            { label: 'System', value: 'system' },
            { label: 'English', value: 'en' },
            { label: 'Svenska', value: 'sv' },
          ]}
        />
      </Card>
      <Card>
        <SectionTitle title="Preview" subtitle="Internal enum values remain unchanged; only display labels are translated." />
        <Text style={styles.line}>{t(data.settings, 'debt')} · {t(data.settings, 'expense')} · {t(data.settings, 'payment')} · {t(data.settings, 'settlement')}</Text>
        <Text style={styles.line}>{t(data.settings, 'owedToYou')}: {formatLocaleCurrency(data.settings, 1200, data.settings.baseCurrency)}</Text>
        <Text style={styles.line}>{formatLocaleDate(data.settings, new Date())}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
