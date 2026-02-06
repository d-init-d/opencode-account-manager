import https from "https";
import {
  AccountHealthResult,
  AccountHealthStatus,
  HealthOAuthConfig,
} from "./types";
import { getHealthOAuthConfig } from "./config-store";

const DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 10000;

// Allowlist for OAuth token endpoints (security)
const ALLOWED_TOKEN_ENDPOINTS = [
  "https://oauth2.googleapis.com/token",
];

// Environment variable to allow custom endpoints
const ALLOW_CUSTOM_ENDPOINT_ENV = "OCAM_OAUTH_ALLOW_CUSTOM_ENDPOINT";

interface OAuthErrorResponse {
  error?: string;
  error_description?: string;
}

interface OAuthSuccessResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

/**
 * Check if custom endpoints are allowed via environment variable
 */
export function isCustomEndpointAllowed(): boolean {
  const envValue = process.env[ALLOW_CUSTOM_ENDPOINT_ENV];
  return envValue === "true" || envValue === "1";
}

/**
 * Validate if a token endpoint is in the allowlist
 */
export function isTokenEndpointAllowed(endpoint: string): boolean {
  // Always allow default endpoint
  if (endpoint === DEFAULT_TOKEN_ENDPOINT) {
    return true;
  }
  // Check allowlist
  if (ALLOWED_TOKEN_ENDPOINTS.includes(endpoint)) {
    return true;
  }
  // Check if custom endpoints are allowed via env
  if (isCustomEndpointAllowed()) {
    return true;
  }
  return false;
}

/**
 * Get the list of allowed token endpoints for display
 */
export function getAllowedTokenEndpoints(): string[] {
  return [...ALLOWED_TOKEN_ENDPOINTS];
}

/**
 * Get warning message if custom endpoint is configured but not allowed
 */
export function getCustomEndpointWarning(configuredEndpoint?: string): string | undefined {
  if (!configuredEndpoint) {
    return undefined;
  }
  
  const endpoint = configuredEndpoint.trim();
  
  // Skip if it's the default endpoint
  if (endpoint === DEFAULT_TOKEN_ENDPOINT) {
    return undefined;
  }
  
  // Skip if it's in the allowlist
  if (ALLOWED_TOKEN_ENDPOINTS.includes(endpoint)) {
    return undefined;
  }
  
  // Check if custom endpoints are allowed
  if (isCustomEndpointAllowed()) {
    return undefined;
  }
  
  return `Warning: Custom OAuth token endpoint "${endpoint}" is not in the allowlist. ` +
    `Set ${ALLOW_CUSTOM_ENDPOINT_ENV}=true to allow custom endpoints. ` +
    `Allowed endpoints: ${ALLOWED_TOKEN_ENDPOINTS.join(", ")}`;
}

function resolveOAuthConfig(): HealthOAuthConfig | undefined {
  const config = getHealthOAuthConfig() || {};
  const clientId = process.env.OCAM_OAUTH_CLIENT_ID || config.clientId;
  // SECURITY: Only read clientSecret from environment variable, never from config file
  const clientSecret = process.env.OCAM_OAUTH_CLIENT_SECRET;
  const tokenEndpoint = process.env.OCAM_OAUTH_TOKEN_ENDPOINT || config.tokenEndpoint;
  if (!clientId || !clientSecret) return undefined;
  return {
    clientId,
    clientSecret,
    tokenEndpoint: tokenEndpoint || DEFAULT_TOKEN_ENDPOINT,
  };
}

export function isOAuthHealthCheckConfigured(): boolean {
  return !!resolveOAuthConfig();
}

function mapOAuthError(
  error?: string,
  description?: string,
  httpStatus?: number
): AccountHealthStatus {
  const desc = (description || "").toLowerCase();

  if (error === "invalid_client") return "not_configured";

  if (error === "invalid_grant") {
    if (desc.includes("disabled")) return "disabled";
    if (desc.includes("deleted")) return "deleted";
    if (desc.includes("password")) return "password_changed";
    if (
      desc.includes("verify") ||
      desc.includes("verification") ||
      desc.includes("challenge") ||
      desc.includes("login_required") ||
      desc.includes("login required")
    ) {
      return "verification_required";
    }
    if (desc.includes("revoked") || desc.includes("expired")) return "revoked";
    return "revoked";
  }

  if (error === "consent_required") return "verification_required";
  if (error === "access_denied") return "disabled";
  if (error === "rate_limit_exceeded") return "network_error";
  if (error === "server_error") return "network_error";
  if (error === "temporarily_unavailable") return "network_error";

  if (httpStatus && httpStatus >= 500) return "network_error";

  return "unknown_error";
}

function buildResult(
  status: AccountHealthStatus,
  source: "oauth",
  detail?: {
    error?: string;
    errorDescription?: string;
    httpStatus?: number;
    message?: string;
  }
): AccountHealthResult {
  return {
    status,
    source,
    checkedAt: Date.now(),
    message: detail?.message,
    errorCode: detail?.error,
    errorDescription: detail?.errorDescription,
    httpStatus: detail?.httpStatus,
  };
}

export function buildOAuthRequestBody(refreshToken: string, config: HealthOAuthConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId || "",
    client_secret: config.clientSecret || "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return params.toString();
}

export async function checkAccountHealthOAuth(
  refreshToken: string
): Promise<AccountHealthResult> {
  const config = resolveOAuthConfig();
  if (!config) {
    return buildResult("not_configured", "oauth", {
      message: "Missing OAuth client_id/client_secret",
    });
  }

  if (!refreshToken) {
    return buildResult("unknown_error", "oauth", {
      message: "Missing refresh token",
    });
  }

  const tokenEndpoint = config.tokenEndpoint || DEFAULT_TOKEN_ENDPOINT;

  // Enforce HTTPS-only token endpoints for security
  if (!tokenEndpoint.startsWith("https://")) {
    return buildResult("not_configured", "oauth", {
      message: "Token endpoint must use HTTPS protocol",
    });
  }

  // Enforce allowlist for token endpoints
  if (!isTokenEndpointAllowed(tokenEndpoint)) {
    return buildResult("not_configured", "oauth", {
      message: `Token endpoint "${tokenEndpoint}" is not in the allowlist. ` +
        `Set ${ALLOW_CUSTOM_ENDPOINT_ENV}=true to allow custom endpoints.`,
    });
  }
  const body = buildOAuthRequestBody(refreshToken, config);

  return new Promise<AccountHealthResult>((resolve) => {
    const request = https.request(
      tokenEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          const httpStatus = response.statusCode || 0;

          try {
            const parsed = JSON.parse(raw) as OAuthSuccessResponse & OAuthErrorResponse;

            if (httpStatus >= 200 && httpStatus < 300 && parsed.access_token) {
              resolve(buildResult("ok", "oauth", { httpStatus }));
              return;
            }

            const status = mapOAuthError(parsed.error, parsed.error_description, httpStatus);
            resolve(
              buildResult(status, "oauth", {
                error: parsed.error,
                errorDescription: parsed.error_description,
                httpStatus,
              })
            );
          } catch (error) {
            const status = httpStatus >= 500 ? "network_error" : "unknown_error";
            resolve(
              buildResult(status, "oauth", {
                httpStatus,
                message: `Invalid response: ${error instanceof Error ? error.message : "unknown"}`,
              })
            );
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Request timeout"));
    });

    request.on("error", (err) => {
      resolve(
        buildResult("network_error", "oauth", {
          message: err.message,
        })
      );
    });

    request.write(body);
    request.end();
  });
}
