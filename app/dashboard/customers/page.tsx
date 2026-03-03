'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { apiRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type Customer = {
  _id: string
  customer_id: string
  full_name: string
  phone: string
  email?: string
  city?: string
  locality?: string
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    full_name: '',
    phone: '',
    email: '',
    city: '',
    locality: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<Customer[]>('/dms/customers')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load DMS customers', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.customer_id || !form.full_name || !form.phone) {
      alert('Customer ID, Name, and Phone are required')
      return
    }
    setSaving(true)
    try {
      await apiRequest<Customer>('/dms/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setOpen(false)
      setForm({
        customer_id: '',
        full_name: '',
        phone: '',
        email: '',
        city: '',
        locality: '',
      })
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">Customers</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Customer master from Lakshmi Hyundai DMS seed (customer id, name, contact, city, locality).
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-neutral-900 text-white">
          Add Customer
        </Button>
      </div>

      <Card className="p-0 overflow-x-auto">
        {loading && <div className="p-4 text-sm text-neutral-500">Loading customers…</div>}
        {!loading && items.length === 0 && (
          <div className="p-4 text-sm text-neutral-500">
            No customers found. Run the DMS seed to import CSV data or add a new customer.
          </div>
        )}
        {!loading && items.length > 0 && (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
                <th className="px-3 py-2 text-left">Customer ID</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">City</th>
                <th className="px-3 py-2 text-left">Locality</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700">{c.customer_id}</td>
                  <td className="px-3 py-2 text-neutral-900">{c.full_name}</td>
                  <td className="px-3 py-2 text-neutral-700">{c.phone}</td>
                  <td className="px-3 py-2 text-neutral-700">{c.email || '-'}</td>
                  <td className="px-3 py-2 text-neutral-700">{c.city || '-'}</td>
                  <td className="px-3 py-2 text-neutral-700">{c.locality || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Customer ID *</Label>
              <Input
                value={form.customer_id}
                onChange={(e) => handleChange('customer_id', e.target.value)}
                placeholder="CUST-0001"
              />
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Ravi Kumar"
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
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Hyderabad"
                />
              </div>
              <div>
                <Label>Locality</Label>
                <Input
                  value={form.locality}
                  onChange={(e) => handleChange('locality', e.target.value)}
                  placeholder="Himayatnagar"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-neutral-900 text-white">
              {saving ? 'Saving…' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

