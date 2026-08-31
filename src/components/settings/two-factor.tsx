"use client";

import { useState } from "react";
import { startTotpSetup, confirmTotp, disableTotp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input, Label, FormError, FormSuccess } from "@/components/ui/forms";

export function TwoFactor({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    setSuccess(null);
    setStarting(true);
    try {
      const result = await startTotpSetup();
      if ("error" in result) {
        setError(result.error);
      } else {
        setSetup(result);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  async function handleConfirm() {
    if (!setup) return;
    setError(null);
    setSuccess(null);
    setConfirming(true);
    try {
      const result = await confirmTotp(setup.secret, code);
      if (result.ok) {
        setSuccess("Two-factor authentication enabled.");
        setEnabled(true);
        setSetup(null);
        setCode("");
      } else {
        setError(result.error ?? "Invalid verification code.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setSuccess(null);
    setConfirming(true);
    try {
      const result = await disableTotp(disableCode);
      if (result.ok) {
        setSuccess("Two-factor authentication disabled.");
        setEnabled(false);
        setDisableCode("");
      } else {
        setError(result.error ?? "Invalid verification code.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCopy() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
    } catch {
      // Clipboard unavailable.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            {enabled
              ? "Two-factor authentication is enabled for your account."
              : "Add an extra layer of security by requiring a one-time code when signing in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <FormError>{error}</FormError>}
          {success && <FormSuccess>{success}</FormSuccess>}

          {!enabled && !setup && (
            <Button onClick={handleStart} loading={starting} className="w-fit">
              Enable
            </Button>
          )}

          {!enabled && setup && (
            <div className="flex flex-col gap-4">
              <div>
                <Label>Setup secret</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {setup.secret}
                  </code>
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    Copy
                  </Button>
                </div>
              </div>
              <div>
                <Label>Scan the QR code with your authenticator app</Label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setup.otpauth)}`}
                  alt="QR code for two-factor authentication"
                  width={220}
                  height={220}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800"
                />
              </div>
              <div>
                <Label htmlFor="totpCode">Verification code</Label>
                <Input
                  id="totpCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="max-w-48"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirm}
                  loading={confirming}
                  disabled={code.length !== 6}
                >
                  Confirm
                </Button>
                <Button variant="ghost" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {enabled && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Enabled
                </span>
                <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
                  Disable
                </Button>
              </div>
              {confirming && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-40">
                    <Label htmlFor="disableCode">Current code</Label>
                    <Input
                      id="disableCode"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                    />
                  </div>
                  <Button
                    variant="danger"
                    onClick={handleDisable}
                    loading={confirming}
                    disabled={disableCode.length !== 6}
                  >
                    Confirm disable
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
