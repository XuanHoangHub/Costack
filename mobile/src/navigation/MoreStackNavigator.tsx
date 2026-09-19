import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { DocsScreen } from '../screens/docs/DocsScreen';
import { DocDetailScreen } from '../screens/docs/DocDetailScreen';
import { FinanceScreen } from '../screens/finance/FinanceScreen';
import { AiBrainScreen } from '../screens/ai/AiBrainScreen';
import { TeamScreen } from '../screens/team/TeamScreen';
import { SpacesScreen } from '../screens/spaces/SpacesScreen';

import { InboxScreen } from '../screens/inbox/InboxScreen';

const Stack = createNativeStackNavigator();

export const MoreStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Docs" component={DocsScreen} />
      <Stack.Screen name="DocDetail" component={DocDetailScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="AiBrain" component={AiBrainScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Spaces" component={SpacesScreen} />
    </Stack.Navigator>
  );
};
