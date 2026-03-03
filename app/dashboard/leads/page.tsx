'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { apiRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Lead = {
  _id: string
  full_name?: string
  phone?: string
  preferred_variant_id?: string
  preferred_mode?: string
  budget_inr?: number
  branch_preference_id?: string
  lead_status?: string
  lead_source?: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    preferred_mode: '',
    preferred_variant_id: '',
    budget_inr: '',
    branch_preference_id: '',
    lead_status: 'New',
    lead_source: '',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiRequest<Lead[]>('/dms/leads')
        setLeads(Array.isArray(data) ? data : [])
      } catch (_) {}
      setLoading(false)
    })()
  }, [])

  const safeLeads = Array.isArray(leads) ? leads : []

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone) {
      alert('Name and Phone are required')
      return
    }
    setSaving(true)
    try {
      await apiRequest<Lead>('/dms/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          budget_inr: form.budget_inr ? Number(form.budget_inr) : undefined,
        }),
      })
      setOpen(false)
      setForm({
        full_name: '',
        phone: '',
        preferred_mode: '',
        preferred_variant_id: '',
        budget_inr: '',
        branch_preference_id: '',
        lead_status: 'New',
        lead_source: '',
      })
      const data = await apiRequest<Lead[]>('/dms/leads')
      setLeads(Array.isArray(data) ? data : [])
    } catch (e: any) {
      alert(e?.message || 'Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  const totals = {
    total: safeLeads.length,
    contacted: safeLeads.filter((l) => l.lead_status === 'Contacted').length,
    qualified: safeLeads.filter((l) => l.lead_status === 'Qualified').length,
    new: safeLeads.filter((l) => l.lead_status === 'New').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">Leads</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-neutral-900 text-white">
          Add Lead
        </Button>
      </div>
      <Card className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total" value={totals.total} color="bg-blue-600" />
          <Stat label="Contacted" value={totals.contacted} color="bg-emerald-600" />
          <Stat label="Qualified" value={totals.qualified} color="bg-amber-600" />
          <Stat label="New" value={totals.new} color="bg-gray-600" />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="bg-[#eef3f9] px-4 py-3 font-semibold text-[#454c53]">Leads by Branch & Status</div>
        <div className="p-4 text-sm text-neutral-700">
          {!loading && safeLeads.length === 0 && 'No leads yet.'}
          {safeLeads.slice(0, 50).map((l) => (
            <div key={l._id} className="grid grid-cols-2 md:grid-cols-6 gap-2 py-2 border-b last:border-0">
              <div className="font-medium text-neutral-900">{l.full_name || 'Lead'}</div>
              <div className="text-neutral-500 text-xs md:text-sm">{l.phone || '-'}</div>
              <div className="text-neutral-500 text-xs md:text-sm">
                {l.preferred_mode || '-'} {l.preferred_variant_id ? `(${l.preferred_variant_id})` : ''}
              </div>
              <div className="text-neutral-500 text-xs md:text-sm">
                {l.budget_inr ? `₹${l.budget_inr.toLocaleString('en-IN')}` : '-'}
              </div>
              <div className="text-neutral-500 text-xs md:text-sm">
                {l.lead_status || '-'} {l.lead_source ? `• ${l.lead_source}` : ''}
              </div>
              <div className="text-neutral-500 text-xs md:text-sm">
                {l.branch_preference_id || '-'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91-9XXXXXXXXX"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Model</Label>
                <Input
                  value={form.preferred_mode}
                  onChange={(e) => handleChange('preferred_mode', e.target.value)}
                  placeholder="Creta"
                />
              </div>
              <div>
                <Label>Preferred Variant ID</Label>
                <Input
                  value={form.preferred_variant_id}
                  onChange={(e) => handleChange('preferred_variant_id', e.target.value)}
                  placeholder="VAR-CRETA-SX-P"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Budget (₹)</Label>
                <Input
                  value={form.budget_inr}
                  onChange={(e) => handleChange('budget_inr', e.target.value)}
                  placeholder="2000000"
                />
              </div>
              <div>
                <Label>Preferred Branch</Label>
                <Input
                  value={form.branch_preference_id}
                  onChange={(e) => handleChange('branch_preference_id', e.target.value)}
                  placeholder="BR-HYD-HN"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Input
                  value={form.lead_status}
                  onChange={(e) => handleChange('lead_status', e.target.value)}
                  placeholder="New / Contacted / Qualified"
                />
              </div>
              <div>
                <Label>Source</Label>
                <Input
                  value={form.lead_source}
                  onChange={(e) => handleChange('lead_source', e.target.value)}
                  placeholder="Walk-in / Referral / Digital"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-neutral-900 text-white">
              {saving ? 'Saving…' : 'Save Lead'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`${color} text-white rounded-md p-4`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  )
}


