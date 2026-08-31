"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/layout/sidebar-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, FormError, FormSuccess } from "@/components/ui/forms";
import { useToast } from "@/components/ui/toast";
import { updateBrandName } from "@/lib/actions/settings";

export function BrandingSettings({
  initialBrandName,
  initialLogoUrl,
}: {
  initialBrandName: string;
  initialLogoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState(initialBrandName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function handleSaveBrand() {
    clearMessages();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("brandName", brandName);
      const res = await updateBrandName(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("Brand name updated.");
        toast({ title: "Brand updated", description: "The application name was updated." });
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    clearMessages();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setLogoUrl(data.url);
      setSuccess("Logo updated.");
      toast({ title: "Logo updated", description: "The application logo was changed." });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    clearMessages();
    try {
      const res = await fetch("/api/settings/logo", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Removal failed.");
        return;
      }
      setLogoUrl(null);
      setSuccess("Logo removed.");
      toast({ title: "Logo removed", description: "The default logo is now shown." });
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customize the logo and name shown across the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error && <FormError>{error}</FormError>}
        {success && <FormSuccess>{success}</FormSuccess>}

        <div className="flex items-center gap-4">
          <BrandMark size="md" logoUrl={logoUrl} brandName={brandName} />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
              {logoUrl ? "Change logo" : "Upload logo"}
            </Button>
            {logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                Remove logo
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted">
          PNG, JPEG, WebP or SVG up to 2MB. Used in the sidebar, sign-in pages and browser
          favicon.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="brandName">App name</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              maxLength={60}
            />
          </div>
          <Button type="button" onClick={handleSaveBrand} loading={saving}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
