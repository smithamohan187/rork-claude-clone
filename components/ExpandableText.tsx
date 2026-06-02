import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ExpandableTextProps {
  text: string;
  numberOfLines?: number;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  numberOfLines = 3,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const [measured, setMeasured] = useState(false);

  const handleTextLayout = useCallback(
    (e: { nativeEvent: { lines: unknown[] } }) => {
      if (!measured) {
        if (e.nativeEvent.lines.length > numberOfLines) {
          setIsLong(true);
        }
        setMeasured(true);
      }
    },
    [measured, numberOfLines],
  );

  return (
    <View>
      {/* Hidden measurement pass — render without numberOfLines to get true line count */}
      {!measured && (
        <View
          style={{ position: 'absolute', opacity: 0, left: 0, right: 0, top: 0 }}
          pointerEvents="none"
        >
          <Text
            style={{ color: '#1A1A1A', fontSize: 14, lineHeight: 22 }}
            onTextLayout={handleTextLayout}
          >
            {text}
          </Text>
        </View>
      )}

      {/* Visible text with truncation applied after measurement */}
      <Text
        style={{ color: '#1A1A1A', fontSize: 14, lineHeight: 22 }}
        numberOfLines={expanded ? undefined : numberOfLines}
      >
        {text}
      </Text>

      {isLong && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text
            style={{
              color: '#1A5C35',
              fontWeight: '400',
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {expanded ? 'See less' : 'See more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ExpandableText;
