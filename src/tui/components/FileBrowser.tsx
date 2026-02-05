import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import * as fs from "fs";
import * as path from "path";
import { getQuickLocations, QuickLocation } from "../../core/config-store";

interface FileBrowserProps {
  mode: "folder" | "file";
  initialPath?: string;
  extensions?: string[]; // e.g., [".ocam", ".json"]
  title?: string;
  onSelect: (selectedPath: string) => void;
  onCancel: () => void;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
  size?: number;
  mtime?: Date;
}

type ViewMode = "quick" | "browse" | "input";

export function FileBrowser({
  mode,
  initialPath,
  extensions = [],
  title,
  onSelect,
  onCancel,
}: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || process.cwd());
  const [items, setItems] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("quick");
  const [inputPath, setInputPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quickLocations, setQuickLocations] = useState<QuickLocation[]>([]);

  // Load quick locations on mount
  useEffect(() => {
    setQuickLocations(getQuickLocations());
  }, []);

  // Load directory contents when path changes
  useEffect(() => {
    if (viewMode !== "browse") return;
    
    try {
      if (!fs.existsSync(currentPath)) {
        setError(`Path not found: ${currentPath}`);
        setItems([]);
        return;
      }

      const stat = fs.statSync(currentPath);
      if (!stat.isDirectory()) {
        setError("Not a directory");
        setItems([]);
        return;
      }

      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      const fileItems: FileItem[] = [];

      // Add parent directory
      const parentPath = path.dirname(currentPath);
      if (parentPath !== currentPath) {
        fileItems.push({
          name: "..",
          isDirectory: true,
          path: parentPath,
        });
      }

      // Add directories and files
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const isDir = entry.isDirectory();

        // Skip hidden files/folders (starting with .)
        if (entry.name.startsWith(".")) continue;

        // In file mode, filter by extension
        if (mode === "file" && !isDir) {
          if (extensions.length > 0) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!extensions.includes(ext)) continue;
          }
        }

        // In folder mode, only show directories
        if (mode === "folder" && !isDir) continue;

        try {
          const stat = fs.statSync(fullPath);
          fileItems.push({
            name: entry.name,
            isDirectory: isDir,
            path: fullPath,
            size: stat.size,
            mtime: stat.mtime,
          });
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort: directories first, then files
      fileItems.sort((a, b) => {
        if (a.name === "..") return -1;
        if (b.name === "..") return 1;
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      setItems(fileItems);
      setSelectedIndex(0);
      setError(null);
    } catch (err) {
      setError(`Error reading directory: ${err}`);
      setItems([]);
    }
  }, [currentPath, viewMode, mode, extensions]);

  useInput((input, key) => {
    // Handle escape
    if (key.escape) {
      if (viewMode === "input") {
        setViewMode("quick");
        setInputPath("");
      } else {
        onCancel();
      }
      return;
    }

    // Handle input mode
    if (viewMode === "input") {
      if (key.return) {
        // Try to navigate to input path
        const trimmed = inputPath.trim();
        if (trimmed) {
          if (fs.existsSync(trimmed)) {
            const stat = fs.statSync(trimmed);
            if (mode === "folder" && stat.isDirectory()) {
              onSelect(trimmed);
            } else if (mode === "file" && stat.isFile()) {
              onSelect(trimmed);
            } else if (stat.isDirectory()) {
              setCurrentPath(trimmed);
              setViewMode("browse");
            } else {
              setError("Invalid path for this mode");
            }
          } else {
            setError("Path does not exist");
          }
        }
        return;
      }

      if (key.backspace || key.delete) {
        setInputPath(prev => prev.slice(0, -1));
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        setInputPath(prev => prev + input);
        return;
      }
      return;
    }

    // Handle quick location mode
    if (viewMode === "quick") {
      // Number keys for quick locations
      const num = parseInt(input, 10);
      if (!isNaN(num) && num >= 1 && num <= quickLocations.length) {
        const loc = quickLocations[num - 1];
        if (mode === "folder") {
          onSelect(loc.path);
        } else {
          setCurrentPath(loc.path);
          setViewMode("browse");
        }
        return;
      }

      // 'p' for paste path
      if (input.toLowerCase() === "p") {
        setViewMode("input");
        return;
      }

      // 'b' for browse
      if (input.toLowerCase() === "b") {
        setViewMode("browse");
        return;
      }

      // Arrow keys to navigate quick locations
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(quickLocations.length - 1, prev + 1));
      }
      if (key.return) {
        const loc = quickLocations[selectedIndex];
        if (loc) {
          if (mode === "folder") {
            onSelect(loc.path);
          } else {
            setCurrentPath(loc.path);
            setViewMode("browse");
          }
        }
      }
      return;
    }

    // Handle browse mode
    if (viewMode === "browse") {
      if (key.upArrow) {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      }
      if (key.downArrow) {
        setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
      }
      if (key.return) {
        const item = items[selectedIndex];
        if (!item) return;

        if (item.isDirectory) {
          if (mode === "folder") {
            // In folder mode, enter selects current folder
            // Navigate into with right arrow
            onSelect(item.path === path.dirname(currentPath) ? currentPath : item.path);
          } else {
            // In file mode, navigate into directory
            setCurrentPath(item.path);
          }
        } else {
          // Select file
          onSelect(item.path);
        }
      }
      if (key.rightArrow) {
        const item = items[selectedIndex];
        if (item?.isDirectory && item.name !== "..") {
          setCurrentPath(item.path);
        }
      }
      if (key.leftArrow) {
        const parent = path.dirname(currentPath);
        if (parent !== currentPath) {
          setCurrentPath(parent);
        }
      }

      // 'p' for paste path
      if (input.toLowerCase() === "p") {
        setViewMode("input");
        return;
      }

      // 'q' for quick locations
      if (input.toLowerCase() === "q") {
        setViewMode("quick");
        return;
      }
    }
  });

  const formatSize = (bytes?: number): string => {
    if (bytes === undefined) return "";
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  };

  const truncatePath = (p: string, maxLen: number): string => {
    if (p.length <= maxLen) return p;
    return "..." + p.slice(-(maxLen - 3));
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title || (mode === "folder" ? "Select Folder" : "Select File")}
        </Text>
      </Box>

      {/* Current path */}
      <Box marginBottom={1}>
        <Text dimColor>Path: </Text>
        <Text>{truncatePath(currentPath, 50)}</Text>
      </Box>

      {/* Error */}
      {error && (
        <Box marginBottom={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}

      {/* Quick Locations View */}
      {viewMode === "quick" && (
        <Box flexDirection="column">
          <Text dimColor>Quick Locations:</Text>
          {quickLocations.map((loc, index) => (
            <Box key={loc.path}>
              <Text color={index === selectedIndex ? "yellow" : "white"}>
                {index === selectedIndex ? "> " : "  "}
                [{index + 1}] {loc.label}
              </Text>
              <Text dimColor> ({truncatePath(loc.path, 30)})</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text dimColor>[1-{quickLocations.length}] Select  [B] Browse  [P] Paste path  [Esc] Cancel</Text>
          </Box>
        </Box>
      )}

      {/* Browse View */}
      {viewMode === "browse" && (
        <Box flexDirection="column">
          <Box flexDirection="column" height={10}>
            {items.slice(
              Math.max(0, selectedIndex - 4),
              Math.max(10, selectedIndex + 6)
            ).map((item, displayIndex) => {
              const actualIndex = Math.max(0, selectedIndex - 4) + displayIndex;
              const isSelected = actualIndex === selectedIndex;
              
              return (
                <Box key={item.path}>
                  <Text color={isSelected ? "yellow" : "white"}>
                    {isSelected ? "> " : "  "}
                    {item.isDirectory ? "📁 " : "📄 "}
                    {item.name}
                  </Text>
                  {!item.isDirectory && (
                    <Text dimColor> ({formatSize(item.size)})</Text>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              [↑↓] Navigate  [Enter] Select  [←→] Navigate dirs  [Q] Quick  [P] Paste  [Esc] Cancel
            </Text>
          </Box>
        </Box>
      )}

      {/* Input View */}
      {viewMode === "input" && (
        <Box flexDirection="column">
          <Text dimColor>Paste or type path:</Text>
          <Box
            borderStyle="single"
            borderColor="yellow"
            paddingX={1}
            marginY={1}
          >
            <Text>
              {inputPath || " "}
              <Text color="yellow">▌</Text>
            </Text>
          </Box>
          <Box>
            <Text dimColor>[Enter] Confirm  [Esc] Back</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
