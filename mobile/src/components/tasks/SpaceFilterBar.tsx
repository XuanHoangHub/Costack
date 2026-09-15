import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Layers, List as ListIcon, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useUiStore } from '../../store/uiStore';
import { useSpaceStore } from '../../store/spaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { RenderSpaceIcon } from '../common/RenderSpaceIcon';

interface SpaceFilterBarProps {
  onSpaceChange?: (spaceId: string | null) => void;
  onListChange?: (listId: string | null) => void;
}

export const SpaceFilterBar: React.FC<SpaceFilterBarProps> = ({
  onSpaceChange,
  onListChange,
}) => {
  const colors = useUiStore((s) => s.getColors());
  const spaces = useSpaceStore((s) => s.spaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useSpaceStore((s) => s.setActiveSpaceId);
  const activeListId = useSpaceStore((s) => s.activeListId);
  const setActiveListId = useSpaceStore((s) => s.setActiveListId);

  const currentSpaces = spaces.filter((s) => !activeWorkspaceId || s.workspaceId === activeWorkspaceId);
  const selectedSpace = currentSpaces.find((s) => s.id === activeSpaceId);

  const handleSelectSpace = (spaceId: string | null) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveSpaceId(spaceId);
    setActiveListId(null);
    onSpaceChange?.(spaceId);
    onListChange?.(null);
  };

  const handleSelectList = (listId: string | null) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveListId(listId);
    onListChange?.(listId);
  };

  return (
    <View style={styles.container}>
      {/* Level 1: Spaces horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spacesScroll}
      >
        {/* All spaces option */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelectSpace(null)}
          style={[
            styles.spacePill,
            {
              backgroundColor:
                activeSpaceId === null
                  ? colors.primarySubtle
                  : colors.surface,
              borderColor:
                activeSpaceId === null ? colors.primary : colors.border,
            },
          ]}
        >
          <Layers
            size={14}
            color={activeSpaceId === null ? colors.primaryText : colors.textMuted}
          />
          <Text
            style={[
              styles.spaceText,
              {
                color:
                  activeSpaceId === null
                    ? colors.primaryText
                    : colors.textSecondary,
                fontWeight: activeSpaceId === null ? '700' : '500',
              },
            ]}
          >
            Tất cả Không gian
          </Text>
        </TouchableOpacity>

        {/* Individual spaces */}
        {currentSpaces.map((sp) => {
          const isSelected = activeSpaceId === sp.id;
          const spColor = sp.themeColor || colors.primary;

          return (
            <TouchableOpacity
              key={sp.id}
              activeOpacity={0.7}
              onPress={() => handleSelectSpace(sp.id)}
              style={[
                styles.spacePill,
                {
                  backgroundColor: isSelected
                    ? `${spColor}22`
                    : colors.surface,
                  borderColor: isSelected ? spColor : colors.border,
                },
              ]}
            >
              <RenderSpaceIcon
                icon={sp.emoji || 'Folder'}
                size={14}
                color={isSelected ? spColor : colors.textSecondary}
              />
              <Text
                style={[
                  styles.spaceText,
                  {
                    color: isSelected ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {sp.name}
              </Text>
              {sp.lists && sp.lists.length > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? spColor
                        : colors.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countText,
                      { color: isSelected ? '#ffffff' : colors.textMuted },
                    ]}
                  >
                    {sp.lists.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Level 2: Sub-lists within active space */}
      {selectedSpace && selectedSpace.lists && selectedSpace.lists.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listsScroll}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleSelectList(null)}
            style={[
              styles.listPill,
              {
                backgroundColor:
                  activeListId === null
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                borderColor:
                  activeListId === null ? colors.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.listText,
                {
                  color:
                    activeListId === null
                      ? colors.primaryText
                      : colors.textMuted,
                  fontWeight: activeListId === null ? '600' : '400',
                },
              ]}
            >
              Tất cả danh sách
            </Text>
          </TouchableOpacity>

          {selectedSpace.lists.map((list) => {
            const isListSelected = activeListId === list.id;

            return (
              <TouchableOpacity
                key={list.id}
                activeOpacity={0.7}
                onPress={() => handleSelectList(list.id)}
                style={[
                  styles.listPill,
                  {
                    backgroundColor: isListSelected
                      ? 'rgba(255,255,255,0.08)'
                      : 'transparent',
                    borderColor: isListSelected
                      ? colors.primary
                      : 'transparent',
                  },
                ]}
              >
                <ListIcon
                  size={12}
                  color={isListSelected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.listText,
                    {
                      color: isListSelected
                        ? colors.textPrimary
                        : colors.textSecondary,
                      fontWeight: isListSelected ? '600' : '400',
                    },
                  ]}
                >
                  {list.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    gap: 6,
  },
  spacesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  spaceText: {
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listsScroll: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  listPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  listText: {
    fontSize: 12,
  },
});
