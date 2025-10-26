"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useUserId } from "~/hooks/use-user-id";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { ArrowLeft, Settings, User, Clock, Palette, Type } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { userId, isLoading: userIdLoading } = useUserId();
  const [timezone, setTimezone] = useState("UTC");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("light");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch existing user settings
  const { data: existingSettings, isLoading: settingsLoading } = api.settings.getUserSettings.useQuery(
    { userId: userId || "" },
    { enabled: !!userId }
  );

  // Upsert mutation
  const upsertSettingsMutation = api.settings.upsertUserSettings.useMutation({
    onSuccess: () => {
      alert("Settings saved successfully!");
    },
    onError: (error) => {
      alert(`Failed to save settings: ${error.message}`);
    },
  });

  // Load settings on mount
  useEffect(() => {
    if (existingSettings && isInitialLoad) {
      setTimezone(existingSettings.timezone);
      setFontSize(existingSettings.readingFontSize);
      setTheme(existingSettings.readingTheme);
      setIsInitialLoad(false);
    } else if (!existingSettings && isInitialLoad) {
      // Auto-detect timezone if no settings exist
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);
      setIsInitialLoad(false);
    }
  }, [existingSettings, isInitialLoad]);

  const handleSaveSettings = () => {
    if (!userId) {
      alert("User ID is not available");
      return;
    }

    upsertSettingsMutation.mutate({
      userId,
      timezone,
      readingFontSize: fontSize,
      readingTheme: theme,
    });
  };

  if (userIdLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600">Customize your reading experience</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>
                Your account and device information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  value={userId || ""}
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-600">
                  This ID is stored locally on your device
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reading Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Reading Preferences
              </CardTitle>
              <CardDescription>
                Customize how content is displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="font-size">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="sepia">Sepia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Settings
              </CardTitle>
              <CardDescription>
                Default settings for release schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
                <p className="text-xs text-gray-600">
                  All release times will be based on this timezone
                </p>
              </div>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                App Information
              </CardTitle>
              <CardDescription>
                About EP-Reader
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm">
                  <div className="font-medium">Version</div>
                  <div className="text-gray-600">1.0.0</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Description</div>
                  <div className="text-gray-600">
                    Read books in digestible chunks with scheduled releases
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Features</div>
                  <div className="text-gray-600">
                    • EPUB parsing and sectioning<br/>
                    • Custom release schedules<br/>
                    • Progress tracking<br/>
                    • Mobile-first design
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            disabled={upsertSettingsMutation.isPending}
          >
            {upsertSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </main>
    </div>
  );
}
