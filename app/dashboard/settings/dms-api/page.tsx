'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function DmsApiSettingsPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ baseUrl: string; apiKey: string; hasApiKey: boolean }>('/dms-api-settings');
      setBaseUrl(data.baseUrl || '');
      // If API key exists, show placeholder; user needs to re-enter to update
      setApiKey(data.hasApiKey ? '••••••••••••' : '');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!baseUrl.trim()) {
      setMessage({ type: 'error', text: 'API base URL is required' });
      return;
    }

    if (!apiKey.trim() || apiKey === '••••••••••••') {
      setMessage({ type: 'error', text: 'API key is required' });
      return;
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (e) {
      setMessage({ type: 'error', text: 'Invalid API base URL format' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      await apiRequest('/dms-api-settings', {
        method: 'PUT',
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      setMessage({ type: 'success', text: 'DMS API settings saved successfully!' });
      // Reload to show masked API key
      setTimeout(() => loadSettings(), 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>DMS API Integration</CardTitle>
          <CardDescription>
            Configure the external DMS API base URL and API key. The API key will be sent as{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription data-slot="alert-description">{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="baseUrl">API Base URL *</Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://api.your-crm.com or https://api.your-crm.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={saving}
            />
            <p className="text-sm text-muted-foreground">
              Enter the base URL without any path (e.g., /inventory or /auth). Paths will be added in the app.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key (e.g., sk_live_abc123...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saving}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate an API key from your DMS provider's Integrations / API keys section.
            </p>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
