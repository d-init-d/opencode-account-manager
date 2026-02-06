/**
 * Fingerprint generator for account imports
 * Uses Node.js crypto module for UUID generation
 */

import { randomUUID, randomBytes } from "crypto";
import { AccountFingerprint } from "./types";

/**
 * Generate random hex string of specified length
 */
function randomHex(len: number): string {
  return randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

/**
 * Generate a new fingerprint for imported accounts
 * Uses Node.js crypto for secure random generation
 */
export function generateFingerprint(): AccountFingerprint {
  const platforms = ["win32/x64", "win32/arm64", "darwin/x64", "darwin/arm64"];
  const ides = ["ANDROID_STUDIO", "INTELLIJ", "IDE_UNSPECIFIED"];
  const clients = [
    "google-cloud-sdk android-studio/2024.1",
    "google-cloud-sdk intellij/2024.1",
    "google-cloud-sdk vscode/1.87.0",
  ];

  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  return {
    deviceId: randomUUID(),
    sessionToken: randomHex(32),
    userAgent: `antigravity/1.15.8 ${platform}`,
    apiClient: clients[Math.floor(Math.random() * clients.length)],
    clientMetadata: {
      ideType: ides[Math.floor(Math.random() * ides.length)],
      platform: platform.startsWith("darwin") ? "MACOS" : "WINDOWS",
      pluginType: "GEMINI",
      osVersion: platform.startsWith("darwin") ? "14.2.1" : "10.0.19042",
      arch: platform.split("/")[1],
      sqmId: `{${randomUUID().toUpperCase()}}`,
    },
    quotaUser: `device-${randomHex(16)}`,
    createdAt: Date.now(),
  };
}
