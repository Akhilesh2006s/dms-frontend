'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, Eye, Pencil } from 'lucide-react'
import { toast } from 'sonner'

type PendingEdit = {
  school_name?: string
  contact_person?: string
  contact_mobile?: string
  contact_person2?: string
  contact_mobile2?: string
  email?: string
  address?: string
  school_type?: string
  zone?: string
  location?: string
  products?: Array<{ product_name: string; quantity: number; unit_price: number }>
  pod_proof_url?: string
  remarks?: string
  total_amount?: number
  requestedBy?: { _id: string; name?: string; email?: string }
  requestedAt?: string
  status?: 'pending' | 'approved' | 'rejected'
  approvedBy?: { _id: string; name?: string }
  approvedAt?: string
  rejectionReason?: string
}

type DcOrder = {
  _id: string
  dc_code?: string
  school_name?: string
  school_code?: string
  school_type?: string
  contact_person?: string
  contact_mobile?: string
  email?: string
  address?: string
  location?: string
  zone?: string
  cluster?: string
  products?: Array<{ product_name: string; quantity: number }>
  assigned_to?: {
    _id: string
    name?: string
    email?: string
  }
  created_at?: string
  createdAt?: string
  remarks?: string
  pod_proof_url?: string
  status?: string
  pendingEdit?: PendingEdit
}

export default function ExecutiveManagerClosedSalesPage() {
  const [items, setItems] = useState<DcOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [viewEditDialogOpen, setViewEditDialogOpen] = useState(false)
  const [selectedEdit, setSelectedEdit] = useState<{ dcOrder: DcOrder; pendingEdit: PendingEdit } | null>(null)
  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      // Get all DC orders to find items with pending edit requests
      let data: DcOrder[] = []
      try {
        const apiCallWithTimeout = (url: string, timeout = 15000) => {
          return Promise.race([
            apiRequest<any>(url),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
          ])
        }
        
        // Fetch all DC orders to find items with pending edit requests
        const allRes = await apiCallWithTimeout(`/dc-orders?limit=1000`)
        const allArray = Array.isArray(allRes) ? allRes : (allRes?.data || [])
        
        // Get items with pending edit requests (regardless of status)
        const itemsWithPendingEdit = allArray.filter((d: any) => {
          const hasPending = d.pendingEdit && d.pendingEdit.status === 'pending'
          if (hasPending) {
            console.log('Found item with pending edit:', {
              id: d._id,
              school_name: d.school_name,
              requestedBy: d.pendingEdit?.requestedBy,
              pendingEdit: d.pendingEdit
            })
          }
          return hasPending
        })
        
        console.log(`Found ${itemsWithPendingEdit.length} items with pending edit requests`)
        data = itemsWithPendingEdit
      } catch (e) {
        console.error('Error loading PO edit requests:', e)
        data = []
      }
      
      // Normalize data
      const normalizedData = data.map((deal: any) => ({
        ...deal,
        school_name: deal.school_name || deal.schoolName || '',
        school_code: deal.school_code || deal.schoolCode || '',
        contact_person: deal.contact_person || deal.contactPerson || '',
        contact_mobile: deal.contact_mobile || deal.contactMobile || deal.mobile || '',
        zone: deal.zone || '',
        location: deal.location || deal.address || '',
        address: deal.address || deal.location || '',
        products: deal.products || [],
        assigned_to: deal.assigned_to || deal.assignedTo,
        school_type: deal.school_type || deal.schoolType || '',
        dc_code: deal.dc_code || deal.dcCode || '',
        remarks: deal.remarks || '',
        cluster: deal.cluster || '',
        pod_proof_url: deal.pod_proof_url || deal.podProofUrl || null,
        pendingEdit: deal.pendingEdit || null,
      }))
      
      // Sort by edit request date (most recent first)
      const sortedData = normalizedData.sort((a: any, b: any) => {
        const dateA = new Date(a.pendingEdit?.requestedAt || a.createdAt || a.created_at || 0).getTime()
        const dateB = new Date(b.pendingEdit?.requestedAt || b.createdAt || b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      setItems(sortedData)
    } catch (e: any) {
      console.error('Failed to load closed sales:', e)
      toast.error(e?.message || 'Failed to load closed sales')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const getProductsDisplay = (deal: DcOrder) => {
    if (!deal.products || !Array.isArray(deal.products)) return '-'
    return deal.products.map(p => `${p.product_name}${p.quantity ? ` - ${p.quantity}` : ''}`).join(', ')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1').replace(', ', ' ')
  }

  const openEditViewDialog = (dcOrder: DcOrder) => {
    if (dcOrder.pendingEdit) {
      setSelectedEdit({ dcOrder, pendingEdit: dcOrder.pendingEdit })
      setViewEditDialogOpen(true)
    }
  }

  const handleApproveEdit = async (dcOrderId: string) => {
    setApproving(dcOrderId)
    try {
      await apiRequest(`/dc-orders/${dcOrderId}/approve-edit`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'approve' }),
      })
      toast.success('PO edit request approved successfully! Changes have been applied to the database and will be reflected in all closed sales views.')
      setViewEditDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve edit request')
    } finally {
      setApproving(null)
    }
  }

  const handleRejectEdit = async (dcOrderId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    
    setRejecting(dcOrderId)
    try {
      await apiRequest(`/dc-orders/${dcOrderId}/approve-edit`, {
        method: 'PUT',
        body: JSON.stringify({ 
          action: 'reject',
          rejectionReason: rejectionReason.trim(),
        }),
      })
      toast.success('Edit request rejected')
      setViewEditDialogOpen(false)
      setRejectionReason('')
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject edit request')
    } finally {
      setRejecting(null)
    }
  }

  // Filter to show only items with pending edit requests
  const editRequestItems = items.filter((item) => 
    item.pendingEdit && item.pendingEdit.status === 'pending'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">PO Edit Request</h1>
        <p className="text-sm text-neutral-600 mt-1">Review and approve/reject PO edit requests from Executives</p>
      </div>

      {/* Search/Filter Section */}
      <Card className="p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="By School Name" />
          <Input placeholder="By Contact Mobile No" />
          <Input type="date" placeholder="From Date" />
          <Input type="date" placeholder="To Date" />
          <Input placeholder="Select Zone" />
          <Input placeholder="Select Executive" />
          <Input placeholder="By Town" />
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Search</Button>
        </div>
      </Card>

      {/* PO Edit Requests Table */}
      <Card className="p-0 overflow-x-auto shadow-sm">
        {loading && <div className="p-6 text-neutral-600">Loading...</div>}
        {!loading && editRequestItems.length === 0 && (
          <div className="p-6 text-neutral-500 text-center">
            <p>No pending PO edit requests found.</p>
            <p className="text-sm mt-2">Executives can submit edit requests from their Client DC page.</p>
          </div>
        )}
        {!loading && editRequestItems.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="font-semibold">S.No</TableHead>
                <TableHead className="font-semibold">Created On</TableHead>
                <TableHead className="font-semibold">School Type</TableHead>
                <TableHead className="font-semibold">Zone</TableHead>
                <TableHead className="font-semibold">Town</TableHead>
                <TableHead className="font-semibold">School Code</TableHead>
                <TableHead className="font-semibold">School Name</TableHead>
                <TableHead className="font-semibold">Executive</TableHead>
                <TableHead className="font-semibold">Mobile</TableHead>
                <TableHead className="font-semibold">Products</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editRequestItems.map((d, index) => (
                <TableRow
                  key={d._id}
                  className={`bg-orange-50 border-l-4 border-orange-500 ${index % 2 === 0 ? '' : 'bg-orange-100/50'}`}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(d.created_at || d.createdAt)}</TableCell>
                  <TableCell>{d.school_type || '-'}</TableCell>
                  <TableCell>{d.zone || '-'}</TableCell>
                  <TableCell>{d.location || d.address?.split(',')[0] || '-'}</TableCell>
                  <TableCell className="font-medium text-blue-700">{d.school_code || '-'}</TableCell>
                  <TableCell className="font-medium">{d.school_name || '-'}</TableCell>
                  <TableCell>{d.assigned_to?.name || d.pendingEdit?.requestedBy?.name || '-'}</TableCell>
                  <TableCell>{d.contact_mobile || '-'}</TableCell>
                  <TableCell className="text-xs">{getProductsDisplay(d)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      Edit Pending
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditViewDialog(d)}
                      className="border-orange-300 hover:bg-orange-100"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Take Action
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* View Edit Dialog */}
      <Dialog open={viewEditDialogOpen} onOpenChange={setViewEditDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-[1000px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PO Edit Request - {selectedEdit?.dcOrder.school_name || 'Client'}</DialogTitle>
            <DialogDescription>
              Review the PO edit changes requested by Executive. Original values are shown for comparison. Approve or reject the changes.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEdit && (
            <div className="space-y-6 py-4">
              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>New Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">School Name</TableCell>
                      <TableCell>{selectedEdit.dcOrder.school_name || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.school_name !== selectedEdit.dcOrder.school_name ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.school_name || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Contact Person</TableCell>
                      <TableCell>{selectedEdit.dcOrder.contact_person || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.contact_person !== selectedEdit.dcOrder.contact_person ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.contact_person || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Contact Mobile</TableCell>
                      <TableCell>{selectedEdit.dcOrder.contact_mobile || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.contact_mobile !== selectedEdit.dcOrder.contact_mobile ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.contact_mobile || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Email</TableCell>
                      <TableCell>{selectedEdit.dcOrder.email || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.email !== selectedEdit.dcOrder.email ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.email || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Zone</TableCell>
                      <TableCell>{selectedEdit.dcOrder.zone || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.zone !== selectedEdit.dcOrder.zone ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.zone || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Location</TableCell>
                      <TableCell>{selectedEdit.dcOrder.location || '-'}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.location !== selectedEdit.dcOrder.location ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.location || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Address</TableCell>
                      <TableCell className="max-w-xs truncate">{selectedEdit.dcOrder.address || '-'}</TableCell>
                      <TableCell className={`max-w-xs truncate ${selectedEdit.pendingEdit.address !== selectedEdit.dcOrder.address ? 'bg-yellow-50 font-medium' : ''}`}>
                        {selectedEdit.pendingEdit.address || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Amount</TableCell>
                      <TableCell>{selectedEdit.dcOrder.total_amount || 0}</TableCell>
                      <TableCell className={selectedEdit.pendingEdit.total_amount !== selectedEdit.dcOrder.total_amount ? 'bg-yellow-50 font-medium' : ''}>
                        {selectedEdit.pendingEdit.total_amount || 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Remarks</TableCell>
                      <TableCell className="max-w-xs truncate">{selectedEdit.dcOrder.remarks || '-'}</TableCell>
                      <TableCell className={`max-w-xs truncate ${selectedEdit.pendingEdit.remarks !== selectedEdit.dcOrder.remarks ? 'bg-yellow-50 font-medium' : ''}`}>
                        {selectedEdit.pendingEdit.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Products Comparison */}
              <div className="border-t pt-4">
                <Label className="text-lg font-semibold mb-4 block">Products</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-neutral-600 mb-2 block">Original Products</Label>
                    <div className="space-y-2">
                      {selectedEdit.dcOrder.products && selectedEdit.dcOrder.products.length > 0 ? (
                        selectedEdit.dcOrder.products.map((p, idx) => (
                          <div key={idx} className="p-2 bg-neutral-50 rounded text-sm">
                            {p.product_name} - Qty: {p.quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-neutral-400">No products</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-neutral-600 mb-2 block">New Products</Label>
                    <div className="space-y-2">
                      {selectedEdit.pendingEdit.products && selectedEdit.pendingEdit.products.length > 0 ? (
                        selectedEdit.pendingEdit.products.map((p, idx) => (
                          <div key={idx} className={`p-2 rounded text-sm ${JSON.stringify(p) !== JSON.stringify(selectedEdit.dcOrder.products?.[idx]) ? 'bg-yellow-50 font-medium' : 'bg-neutral-50'}`}>
                            {p.product_name} - Qty: {p.quantity} - Price: {p.unit_price}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-neutral-400">No products</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Info */}
              <div className="border-t pt-4">
                <div className="text-sm text-neutral-600">
                  <p><strong>Requested by:</strong> {selectedEdit.pendingEdit.requestedBy?.name || 'Unknown'}</p>
                  <p><strong>Requested at:</strong> {formatDate(selectedEdit.pendingEdit.requestedAt)}</p>
                </div>
              </div>

              {/* Rejection Reason Input */}
              <div className="border-t pt-4">
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewEditDialogOpen(false)
                setRejectionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRejectEdit(selectedEdit!.dcOrder._id)}
              disabled={rejecting === selectedEdit?.dcOrder._id || !rejectionReason.trim()}
            >
              {rejecting === selectedEdit?.dcOrder._id ? (
                'Rejecting...'
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={() => handleApproveEdit(selectedEdit!.dcOrder._id)}
              disabled={approving === selectedEdit?.dcOrder._id}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approving === selectedEdit?.dcOrder._id ? (
                'Approving...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

