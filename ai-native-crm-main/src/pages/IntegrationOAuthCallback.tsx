import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { settingsApi } from "../lib/api";

type CallbackStatus = "working" | "success" | "error";

const providerMap: Record<string, string> = {
  google: "google-workspace",
  microsoft: "microsoft-365",
  slack: "slack",
  salesforce: "salesforce",
  hubspot: "hubspot",
  quickbooks: "quickbooks",
  xero: "xero",
};

export default function IntegrationOAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>("working");
  const [message, setMessage] = useState("Completing connector authorization...");

  const providerKey = useMemo(() => {
    if (!provider) return null;
    return providerMap[provider] ?? null;
  }, [provider]);

  useEffect(() => {
    const runExchange = async () => {
      if (!providerKey) {
        setStatus("error");
        setMessage("Unknown integration provider callback.");
        return;
      }

      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        setStatus("error");
        setMessage(errorDescription || `Provider returned an OAuth error: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authorization code or state in the callback URL.");
        return;
      }

      try {
        await settingsApi.exchangeIntegrationOAuth(providerKey, { code, state });
        setStatus("success");
        setMessage("Connector authorization completed successfully.");
      } catch (exchangeError) {
        console.error("Failed to complete integration OAuth callback:", exchangeError);
        setStatus("error");
        setMessage("The connector code exchange failed. Return to Settings and try the flow again.");
      }
    };

    void runExchange();
  }, [location.search, providerKey]);

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Integration Authorization</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Provider callback for {providerKey ?? "unknown integration"}.
            </p>
          </div>

          <div
            className={
              status === "success"
                ? "rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
                : status === "error"
                  ? "rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                  : "rounded-lg border border-border bg-muted/30 p-4 text-muted-foreground"
            }
          >
            {message}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Return To Settings
            </button>
            {status === "error" ? (
              <button
                onClick={() => navigate("/settings")}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Retry From Integrations
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
