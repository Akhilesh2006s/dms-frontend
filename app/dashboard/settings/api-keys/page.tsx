'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Plus, Copy, Trash2, Eye, EyeOff, Key } from 'lucide-react';
import { toast } from 'sonner';

type ApiKey = {
  id: string;
  name: string;
  keyPreview: string;
  keyPrefix: string;
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  isActive: boolean;
  isValid: boolean;
  permissions: string[];
  description: string;
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiresInDays: '',
    permissions: ['read', 'write'] as string[],
    prefix: 'crm_live',
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ apiKeys: ApiKey[] }>('/api-keys');
      setApiKeys(data.apiKeys || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.name.trim()) {
      toast.error('API key name is required');
      return;
    }

    try {
      setGenerating(true);
      const data = await apiRequest<{ apiKey: { key: string; name: string } }>('/api-keys/generate', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          expiresInDays: formData.expiresInDays ? parseInt(formData.expiresInDays) : null,
          permissions: formData.permissions,
          prefix: formData.prefix,
        }),
      });

      setNewKey(data.apiKey.key);
      setShowGenerateDialog(false);
      setShowNewKeyDialog(true);
      setFormData({
        name: '',
        description: '',
        expiresInDays: '',
        permissions: ['read', 'write'],
        prefix: 'crm_live',
      });
      await loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard!');
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? It will no longer work.')) {
      return;
    }

    try {
      await apiRequest(`/api-keys/${id}/revoke`, { method: 'PUT' });
      toast.success('API key revoked successfully');
      await loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiRequest(`/api-keys/${id}`, { method: 'DELETE' });
      toast.success('API key deleted successfully');
      await loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (key: ApiKey) => {
    if (!key.isActive) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage API keys for external integrations
          </p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            API keys allow external systems to authenticate with your CRM. Keep them secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No API keys generated yet</p>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Your First API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Preview</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{key.name}</div>
                        {key.description && (
                          <div className="text-sm text-muted-foreground">{key.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPreview}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {key.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(key)}</TableCell>
                    <TableCell className="text-sm">{formatDate(key.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(key.lastUsed)}</TableCell>
                    <TableCell className="text-sm">
                      {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(key.id)}
                          disabled={!key.isActive}
                        >
                          Revoke
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(key.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for external integrations. You'll only see the full key once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Production API Key"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (Days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                placeholder="Leave empty for no expiration"
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prefix">Key Prefix</Label>
              <Input
                id="prefix"
                placeholder="crm_live"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Key'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Generated!</DialogTitle>
            <DialogDescription>
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Save this key now. You will not be able to see it again!
                </AlertDescription>
              </Alert>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={newKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyKey(newKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-2">Usage Example:</p>
              <code className="text-xs block">
                Authorization: Bearer {newKey.substring(0, 20)}...
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewKeyDialog(false)}>I've Saved It</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
