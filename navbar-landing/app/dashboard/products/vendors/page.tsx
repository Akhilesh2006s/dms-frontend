'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { apiRequest } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { toast } from 'sonner'
import { PlusCircle, Building2, Eye, RefreshCw } from 'lucide-react'

type Vendor = {
  _id: string
  name: string
  email: string
  isActive?: boolean
  createdAt?: string
  vendorAssignedProducts?: Array<{ _id: string; productName: string }>
}

export default function VendorsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUser = mounted ? getCurrentUser() : null
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin'

  const loadVendors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<Vendor[]>('/vendors')
      setVendors(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const msg = err?.message || 'Failed to load vendors'
      setError(msg)
      toast.error(msg)
      setVendors([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (currentUser && !isAdmin) {
      toast.error('Access denied. Admin privileges required.')
      router.push('/dashboard')
      return
    }
    loadVendors()
  }, [mounted, isAdmin, router, loadVendors])

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (currentUser && !isAdmin) {
    return null
  }

  if (loading && vendors.length === 0 && !error) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center text-neutral-500">Loading vendors...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">Vendors</h1>
          <p className="text-sm text-neutral-600 mt-1">Manage vendor accounts and product assignments</p>
        </div>
        <Link href="/dashboard/products/vendors/new">
          <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={loadVendors}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 md:p-6">
        {vendors.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
            <p>No vendors yet. Add your first vendor to get started.</p>
            <Link href="/dashboard/products/vendors/new">
              <Button variant="outline" size="sm" className="mt-4">
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Vendor Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Assigned Products Count</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Created Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-3 px-4 font-medium">{vendor.name}</td>
                    <td className="py-3 px-4 text-neutral-600">{vendor.email}</td>
                    <td className="py-3 px-4">
                      {Array.isArray(vendor.vendorAssignedProducts) ? vendor.vendorAssignedProducts.length : 0}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={vendor.isActive !== false ? 'default' : 'secondary'}
                        className={vendor.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {vendor.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-neutral-600">
                      {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/products/vendors/${vendor._id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
