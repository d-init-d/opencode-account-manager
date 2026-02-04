import fs from "fs";
import path from "path";

export function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const raw = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, raw, "utf8");
}

export function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

export function toLowerTrim(input: string): string {
  return input.trim().toLowerCase();
}
