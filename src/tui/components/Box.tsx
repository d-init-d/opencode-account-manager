import React from "react";
import { Box as InkBox, Text } from "ink";

interface BoxProps {
  title?: string;
  children: React.ReactNode;
  borderColor?: string;
  width?: number | string;
  padding?: number;
}

export function Box({
  title,
  children,
  borderColor = "gray",
  width,
  padding = 1,
}: BoxProps) {
  return (
    <InkBox
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      width={width}
      paddingX={padding}
    >
      {title && (
        <InkBox marginBottom={1}>
          <Text bold>
            {title}
          </Text>
        </InkBox>
      )}
      {children}
    </InkBox>
  );
}
