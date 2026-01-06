'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, PlusCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProducts } from '@/hooks/useProducts'
import { toast } from 'sonner'

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
  dcRequestData?: any
  isLead?: boolean // Flag to identify if this is a converted lead
  // Delivery and Address fields
  property_number?: string
  floor?: string
  tower_block?: string
  nearby_landmark?: string
  area?: string
  city?: string
  pincode?: string
  pendingEdit?: {
    property_number?: string
    floor?: string
    tower_block?: string
    nearby_landmark?: string
    area?: string
    city?: string
    pincode?: string
    status?: string
  }
}

type DC = {
  _id: string
  dcOrderId?: string | DcOrder
  saleId?: {
    _id: string
    customerName?: string
    product?: string
    quantity?: number
  }
  customerName?: string
  customerPhone?: string
  product?: string
  status?: string
  poPhotoUrl?: string
  dcDate?: string
  dcRemarks?: string
  dcCategory?: string
  dcNotes?: string
  productDetails?: Array<{
    product: string
    class: string
    category: string
    productName: string
    quantity: number
    strength?: number
    price?: number
    total?: number
    level?: string
  }>
}

export default function ClosedSalesPage() {
  const [items, setItems] = useState<DcOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeal, setSelectedDeal] = useState<DcOrder | null>(null)
  const [openRaiseDCDialog, setOpenRaiseDCDialog] = useState(false)
  const [openLocationDialog, setOpenLocationDialog] = useState(false)
  const [openPOPhotoDialog, setOpenPOPhotoDialog] = useState(false)
  const [selectedPOPhotoUrl, setSelectedPOPhotoUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<{ _id: string; name: string }[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  // Map to store existing DCs for each deal: dealId -> DC
  const [dealDCs, setDealDCs] = useState<Record<string, DC>>({})
  const [existingDC, setExistingDC] = useState<DC | null>(null)
  
  // Get current user to check role
  const currentUser = getCurrentUser()
  const isManager = currentUser?.role === 'Manager'
  const isSuperAdmin = currentUser?.role === 'Super Admin'
  const isCoordinator = currentUser?.role === 'Coordinator'
  const isEmployee = currentUser?.role === 'Executive'
  const isAdmin = currentUser?.role === 'Admin'
  // Employees can request DC, Coordinators/Admins can approve or send to senior
  const canRequestDC = isEmployee
  const canApproveDC = isSuperAdmin || isCoordinator || isAdmin
  
  // Form state for Raise DC modal
  const [dcDate, setDcDate] = useState('')
  const [dcRemarks, setDcRemarks] = useState('')
  const [dcCategory, setDcCategory] = useState('')
  const [dcNotes, setDcNotes] = useState('')
  
  // Product rows for DC (like in the Raise DC form)
  type ProductRow = {
    id: string
    product: string
    class: string
    category: string
    specs: string
    subject?: string
    strength: number
    level: string
    term: string
  }
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { id: '1', product: 'Abacus', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1', term: 'Term 1' }
  ])
  
  const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  const defaultCategories = ['New Students', 'Existing Students', 'Both']
  const { productNames: availableProducts, getProductLevels, getDefaultLevel, getProductSpecs, getProductSubjects, getProductCategories, hasProductCategories } = useProducts()
  
  // Get available levels for a specific product, default to L1 if product not found
  const getAvailableLevels = (product: string): string[] => {
    return getProductLevels(product)
  }

  const load = async () => {
    setLoading(true)
    try {
      // Try multiple statuses that might indicate closed deals
      // First try 'completed', then try all statuses to see what we have
      let data: DcOrder[] = []
      try {
        // Get all statuses in parallel for better performance with reduced timeout
        // Note: API returns paginated response { data: [...], pagination: {...} }
        const apiCallWithTimeout = (url: string, timeout = 8000) => {
          return Promise.race([
            apiRequest<any>(url),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
          ])
        }
        
        // Reduced limit for faster initial load - can be increased if needed
        // Also fetch Term 2 split DCs (scheduled_for_later) that are linked to dc_requested DcOrders
        const [completedRes, savedRes, dcRequestedRes, dcAcceptedRes, term2DCsRes] = await Promise.all([
          apiCallWithTimeout(`/dc-orders?status=completed&limit=500`),
          apiCallWithTimeout(`/dc-orders?status=saved&limit=500`),
          apiCallWithTimeout(`/dc-orders?status=dc_requested&limit=500`),
          apiCallWithTimeout(`/dc-orders?status=dc_accepted&limit=500`),
          apiCallWithTimeout(`/dc?status=scheduled_for_later&limit=500`).catch(() => ({ data: [] })) // Don't fail if this fails
        ])
        // Extract data array from paginated response or use direct array
        const completedArray = Array.isArray(completedRes) ? completedRes : (completedRes?.data || [])
        const savedArray = Array.isArray(savedRes) ? savedRes : (savedRes?.data || [])
        const dcRequestedArray = Array.isArray(dcRequestedRes) ? dcRequestedRes : (dcRequestedRes?.data || [])
        const dcAcceptedArray = Array.isArray(dcAcceptedRes) ? dcAcceptedRes : (dcAcceptedRes?.data || [])
        const term2DCsArray = Array.isArray(term2DCsRes) ? term2DCsRes : (term2DCsRes?.data || [])
        
        console.log('📊 Loaded DcOrders:', {
          completed: completedArray.length,
          saved: savedArray.length,
          dc_requested: dcRequestedArray.length,
          dc_accepted: dcAcceptedArray.length,
          term2_split_dcs: term2DCsArray.length
        })
        console.log('📋 dc_requested items:', dcRequestedArray.map((d: any) => ({
          id: d._id,
          school_name: d.school_name,
          status: d.status,
          updatedAt: d.updatedAt || d.updated_at
        })))
        console.log('📋 Term 2 split DCs:', term2DCsArray.map((d: any) => ({
          id: d._id,
          dcOrderId: d.dcOrderId?._id || d.dcOrderId,
          customerName: d.customerName,
          status: d.status
        })))
        
        // Get DcOrder IDs that have Term 2 split DCs
        const dcOrderIdsWithTerm2DC = new Set(
          term2DCsArray
            .map((dc: any) => {
              const dcOrderId = dc.dcOrderId?._id || dc.dcOrderId
              return dcOrderId ? String(dcOrderId) : null
            })
            .filter(Boolean)
        )
        
        console.log('🔗 DcOrder IDs with Term 2 split DCs:', Array.from(dcOrderIdsWithTerm2DC))
        
        // Filter out DcOrders that have Term 2 split DCs - we'll show the DCs instead
        const dcRequestedWithoutTerm2 = dcRequestedArray.filter((d: any) => {
          const hasTerm2DC = dcOrderIdsWithTerm2DC.has(String(d._id))
          if (hasTerm2DC) {
            console.log(`⚠️ Filtering out DcOrder ${d._id} (${d.school_name}) - has Term 2 split DC`)
          }
          return !hasTerm2DC
        })
        
        // Convert Term 2 DCs to DcOrder-like format for display in Closed Sales
        const term2DCsAsDeals: DcOrder[] = term2DCsArray.map((dc: any) => {
          const dcOrderId = dc.dcOrderId?._id || dc.dcOrderId
          // Find the original DcOrder to get school details
          const originalDcOrder = dcRequestedArray.find((d: any) => String(d._id) === String(dcOrderId))
          
          return {
            _id: dc._id, // Use DC ID as the unique identifier
            dcOrderId: dcOrderId, // Keep reference to original DcOrder
            school_name: dc.customerName || originalDcOrder?.school_name || '',
            contact_person: originalDcOrder?.contact_person || '',
            contact_mobile: dc.customerPhone || originalDcOrder?.contact_mobile || '',
            email: dc.customerEmail || originalDcOrder?.email || '',
            address: dc.customerAddress || originalDcOrder?.address || '',
            location: originalDcOrder?.location || '',
            zone: originalDcOrder?.zone || '',
            school_type: originalDcOrder?.school_type || '',
            products: dc.productDetails || originalDcOrder?.products || [],
            assigned_to: originalDcOrder?.assigned_to || undefined,
            created_at: dc.createdAt || originalDcOrder?.created_at,
            createdAt: dc.createdAt || originalDcOrder?.createdAt,
            remarks: dc.dcRemarks || originalDcOrder?.remarks || '',
            status: 'dc_requested', // Show as dc_requested since DcOrder has this status
            dc_code: originalDcOrder?.dc_code || undefined,
            pod_proof_url: dc.poPhotoUrl || dc.poDocument || originalDcOrder?.pod_proof_url || undefined,
            isTerm2SplitDC: true, // Flag to identify this is a Term 2 split DC
            term2DCId: dc._id, // Store the actual DC ID
          } as DcOrder
        })
        
        console.log(`✅ Converted ${term2DCsAsDeals.length} Term 2 split DCs to DcOrder format`)
        
        data = [...completedArray, ...savedArray, ...dcRequestedWithoutTerm2, ...dcAcceptedArray, ...term2DCsAsDeals].filter((d: any) => 
          d.status !== 'dc_approved' && d.status !== 'dc_sent_to_senior'
        )
      } catch (e) {
        // If no completed deals, try getting all deals and filter client-side
        console.log('No completed deals found, trying all deals...')
        try {
          const allDealsRes = await Promise.race([
            apiRequest<any>(`/dc-orders?limit=500`),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 8000)
            )
          ])
          // Extract data array from paginated response or use direct array
          const dealsArray = Array.isArray(allDealsRes) ? allDealsRes : (allDealsRes?.data || [])
          // Filter for deals that might be considered "closed" - including saved (converted leads)
          data = dealsArray.filter((d: any) => 
            (d.status === 'completed' || 
            d.status === 'saved' || // Include saved status for converted leads
            d.status === 'in_transit' || 
            d.lead_status === 'Hot' ||
            d.status === 'hold' ||
            d.status === 'dc_requested' || // Include DC requests from employees
            d.status === 'dc_accepted') && // Include accepted DC requests (can be updated later)
            d.status !== 'dc_approved' && // Exclude approved (already processed)
            d.status !== 'dc_sent_to_senior' // Exclude sent to senior coordinator
          )
        } catch (timeoutError) {
          console.warn('Timeout loading all deals, using empty array')
          data = []
        }
      }
      
      // Also fetch leads with status "Closed" and convert them to DcOrder format
      try {
        const closedLeadsRes = await Promise.race([
          apiRequest<any>(`/leads?status=Closed&limit=500`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 8000)
          )
        ])
        const closedLeadsArray = Array.isArray(closedLeadsRes) ? closedLeadsRes : (closedLeadsRes?.data || [])
        
        // Convert closed leads to DcOrder format for display
        const closedLeadsAsDeals: DcOrder[] = closedLeadsArray.map((lead: any) => ({
          _id: lead._id,
          school_name: lead.school_name || '',
          contact_person: lead.contact_person || '',
          contact_mobile: lead.contact_mobile || '',
          email: lead.email || '',
          address: lead.address || lead.location || '',
          location: lead.location || lead.address || '',
          zone: lead.zone || '',
          school_type: lead.school_type || '',
          products: lead.products || [],
          assigned_to: lead.managed_by || lead.assigned_by || lead.createdBy || undefined,
          created_at: lead.createdAt,
          createdAt: lead.createdAt,
          remarks: lead.remarks || '',
          status: 'Closed', // Mark as Closed to distinguish from DcOrders
          dc_code: undefined, // Leads don't have DC codes
          pod_proof_url: undefined, // Leads might have PO in associated DC
          isLead: true, // Flag to identify this is a lead, not a DcOrder
        }))
        
        // Filter out closed leads that have a corresponding DcOrder with status 'dc_requested' or 'dc_accepted'
        // This prevents duplicates where the same school appears twice (once as closed lead with "Raise DC" and once as DcOrder with "Review DC Request")
        const filteredClosedLeads = closedLeadsAsDeals.filter((lead: DcOrder) => {
          // Check if there's a DcOrder with status 'dc_requested' or 'dc_accepted' for this lead
          // Match by school_name and contact_mobile to identify duplicates
          const hasMatchingDcOrder = data.some((dcOrder: any) => {
            const schoolNameMatch = (dcOrder.school_name || '').toLowerCase().trim() === (lead.school_name || '').toLowerCase().trim()
            const mobileMatch = (dcOrder.contact_mobile || '').trim() === (lead.contact_mobile || '').trim()
            const isDcRequested = dcOrder.status === 'dc_requested' || dcOrder.status === 'dc_accepted'
            
            // If school name and mobile match, and the DcOrder has dc_requested or dc_accepted status, exclude the closed lead
            return schoolNameMatch && mobileMatch && isDcRequested
          })
          
          // Only include the closed lead if there's no matching DcOrder with dc_requested/dc_accepted status
          return !hasMatchingDcOrder
        })
        
        // Merge filtered closed leads with DcOrders
        data = [...data, ...filteredClosedLeads]
        console.log('Loaded closed leads:', closedLeadsAsDeals.length, 'Filtered to:', filteredClosedLeads.length, '(removed duplicates with dc_requested/dc_accepted status)')
      } catch (e) {
        console.warn('Failed to load closed leads:', e)
        // Continue without closed leads if API fails
      }
      
      console.log('Loaded closed deals:', data)
      console.log('First deal sample:', data[0])
      
      // Load existing DCs for all deals efficiently (fetch only DCs for deals we have)
      const dcMap: Record<string, DC> = {}
      try {
        // Only fetch DCs if we have deals to check
        if (data.length > 0) {
          // Fetch DCs with a reasonable limit - only for deals we actually have
          // This is much more efficient than fetching 10000 DCs
          const dealIds = data.filter((d: any) => !d.isLead).map((d: any) => d._id)
          const leadIds = data.filter((d: any) => d.isLead).map((d: any) => d._id)
          
          // Fetch DCs with timeout and reasonable limit
          // Also fetch Term 2 DCs (scheduled_for_later) that might be split from original DCs
          const [allDCsRes, term2DCsRes] = await Promise.all([
            Promise.race([
              apiRequest<any>(`/dc?limit=2000`),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 8000)
              )
            ]),
            Promise.race([
              apiRequest<any>(`/dc?status=scheduled_for_later&limit=500`),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 8000)
              )
            ]).catch(() => ({ data: [] })) // Don't fail if this query fails
          ])
          const allDCsArray = Array.isArray(allDCsRes) ? allDCsRes : (allDCsRes?.data || [])
          const term2DCsArray = Array.isArray(term2DCsRes) ? term2DCsRes : (term2DCsRes?.data || [])
          
          console.log('📦 Loaded DCs:', {
            all: allDCsArray.length,
            term2_split: term2DCsArray.length
          })
        
          // Build map for DcOrders - prioritize Term 2 split DCs (scheduled_for_later)
          dealIds.forEach((dealId: string) => {
            // First, check for Term 2 split DC (scheduled_for_later) - these are the split DCs
            const term2DC = term2DCsArray.find((dc: any) => {
              const dcOrderId = dc.dcOrderId?._id || dc.dcOrderId
              return dcOrderId === dealId || (typeof dcOrderId === 'string' && dcOrderId === dealId)
            })
            
            if (term2DC) {
              // Use Term 2 split DC if it exists
              dcMap[dealId] = term2DC
              console.log(`✅ Found Term 2 split DC for DcOrder ${dealId}:`, term2DC._id)
            } else {
              // Otherwise, use any other DC linked to this DcOrder
              const relatedDC = allDCsArray.find((dc: any) => {
                const dcOrderId = dc.dcOrderId?._id || dc.dcOrderId
                return dcOrderId === dealId || (typeof dcOrderId === 'string' && dcOrderId === dealId)
              })
              if (relatedDC) {
                dcMap[dealId] = relatedDC
              }
            }
          })
          
          // Build map for Leads
          leadIds.forEach((leadId: string) => {
            const relatedDC = allDCsArray.find((dc: any) => {
              const dcOrderId = dc.dcOrderId?._id || dc.dcOrderId
              const saleId = dc.saleId?._id || dc.saleId
              return dcOrderId === leadId || 
                     (typeof dcOrderId === 'string' && dcOrderId === leadId) ||
                     saleId === leadId ||
                     (typeof saleId === 'string' && saleId === leadId)
            })
            if (relatedDC) {
              dcMap[leadId] = relatedDC
            }
          })
        }
        
        setDealDCs(dcMap)
        console.log('Loaded DCs for deals:', Object.keys(dcMap).length, 'DCs found')
      } catch (e) {
        console.warn('Failed to load DCs:', e)
        // Continue without DCs - they're optional
      }
      
      // Ensure all deals have proper structure
      const normalizedData = data.map((deal: any) => {
        // Handle assigned_to - preserve populated object if it exists
        let assignedTo = deal.assigned_to || deal.assignedTo
        
        console.log('Processing deal:', deal.school_name)
        console.log('  - assigned_to raw:', assignedTo)
        console.log('  - assigned_to type:', typeof assignedTo)
        
        if (assignedTo) {
          if (typeof assignedTo === 'object' && assignedTo !== null && '_id' in assignedTo) {
            // Already populated, keep it
            console.log('  - Keeping populated object:', assignedTo)
            assignedTo = assignedTo
          } else if (typeof assignedTo === 'string' && assignedTo.trim() !== '') {
            // It's just an ID string - try to fetch employee name
            console.log('  - It\'s a string ID, will try to get from API')
            // Keep it as is for now, the getOne API should populate it
            assignedTo = { _id: assignedTo, name: 'Loading...' }
          } else {
            console.log('  - assigned_to is invalid, setting to undefined')
            assignedTo = undefined
          }
        } else {
          console.log('  - No assigned_to found')
          assignedTo = undefined
        }
        
        return {
          ...deal,
          school_name: deal.school_name || deal.schoolName || '',
          school_code: deal.school_code || deal.schoolCode || '',
          contact_person: deal.contact_person || deal.contactPerson || '',
          contact_mobile: deal.contact_mobile || deal.contactMobile || deal.mobile || '',
          zone: deal.zone || '',
          location: deal.location || deal.address || '',
          address: deal.address || deal.location || '',
          products: deal.products || [],
          assigned_to: assignedTo,
          school_type: deal.school_type || deal.schoolType || '',
          dc_code: deal.dc_code || deal.dcCode || '',
          remarks: deal.remarks || '',
          cluster: deal.cluster || '',
          pod_proof_url: deal.pod_proof_url || deal.podProofUrl || null,
        }
      })
      
      // Sort: dc_requested items first (by updatedAt), then others by creation date (most recent first)
      const sortedData = normalizedData.sort((a: any, b: any) => {
        const aIsRequested = a.status === 'dc_requested'
        const bIsRequested = b.status === 'dc_requested'
        
        // If one is dc_requested and the other isn't, prioritize dc_requested
        if (aIsRequested && !bIsRequested) return -1
        if (!aIsRequested && bIsRequested) return 1
        
        // If both are dc_requested, sort by updatedAt (most recent first)
        if (aIsRequested && bIsRequested) {
          const dateA = new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime()
          const dateB = new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime()
          return dateB - dateA
        }
        
        // Otherwise, sort by creation date (most recent first)
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      // Remove duplicates based on school_name + contact_mobile
      // Prioritize: dc_requested > dc_accepted > other statuses
      // Keep the most recent entry (already sorted, so first occurrence is most recent)
      const seen = new Map<string, DcOrder>()
      const uniqueData: DcOrder[] = []
      
      for (const item of sortedData) {
        // Create a unique key from school_name and contact_mobile (case-insensitive)
        const schoolName = (item.school_name || '').toLowerCase().trim()
        const contactMobile = (item.contact_mobile || '').trim()
        const uniqueKey = `${schoolName}|${contactMobile}`
        
        // Only add if we haven't seen this combination before
        if (!seen.has(uniqueKey)) {
          seen.set(uniqueKey, item)
          uniqueData.push(item)
        } else {
          // Check if the new item has a higher priority status than the existing one
          const existing = seen.get(uniqueKey)!
          const existingPriority = existing.status === 'dc_requested' ? 3 : 
                                   existing.status === 'dc_accepted' ? 2 : 
                                   existing.status === 'Closed' ? 0 : 1
          const newPriority = item.status === 'dc_requested' ? 3 : 
                              item.status === 'dc_accepted' ? 2 : 
                              item.status === 'Closed' ? 0 : 1
          
          // Replace if new item has higher priority (dc_requested > dc_accepted > others > Closed)
          if (newPriority > existingPriority) {
            console.log(`Replacing duplicate with higher priority: ${item.school_name} - ${item.contact_mobile} (${existing.status} -> ${item.status})`)
            const index = uniqueData.findIndex(d => {
              const dSchoolName = (d.school_name || '').toLowerCase().trim()
              const dContactMobile = (d.contact_mobile || '').trim()
              return `${dSchoolName}|${dContactMobile}` === uniqueKey
            })
            if (index !== -1) {
              uniqueData[index] = item
              seen.set(uniqueKey, item)
            }
          } else {
            console.log(`Removing duplicate (lower priority): ${item.school_name} - ${item.contact_mobile} (${item.status} vs ${existing.status})`)
          }
        }
      }
      
      console.log(`Removed ${sortedData.length - uniqueData.length} duplicate entries`)
      setItems(uniqueData)
      console.log('Normalized deals:', sortedData)
      console.log('First deal assigned_to:', sortedData[0]?.assigned_to)
    } catch (e: any) {
      console.error('Failed to load closed deals:', e)
      const errorMessage = e?.message || 'Unknown error'
      // Provide more context if it's a filter error
      if (errorMessage.includes('filter is not a function')) {
        alert(`Error loading deals: The API returned invalid data format. Please check the server response.`)
      } else {
        alert(`Error loading deals: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Load employees for assignment dropdown
    const loadEmployees = async () => {
      try {
        const data = await apiRequest<any[]>('/employees?isActive=true')
        const list = Array.isArray(data) ? data : []
        setEmployees(list.map((u: any) => ({ _id: u._id || u.id, name: u.name || 'Unknown' })).filter(e => e.name !== 'Unknown'))
      } catch (e) {
        console.error('Failed to load employees:', e)
      }
    }
    loadEmployees()
  }, [])

  const openRaiseDC = async (deal: DcOrder) => {
    try {
      // Check if this is a Term 2 split DC
      const isTerm2SplitDC = (deal as any).isTerm2SplitDC
      const term2DCId = (deal as any).term2DCId
      
      // Check if DC already exists for this deal
      const existingDCForDeal = dealDCs[deal._id]
      setExistingDC(existingDCForDeal || null)
      
      // For Term 2 split DCs, fetch the actual DC data instead of DcOrder
      let fullDeal: DcOrder
      if (isTerm2SplitDC && term2DCId) {
        console.log('📦 Loading Term 2 split DC:', term2DCId)
        try {
          const term2DC = await apiRequest<DC>(`/dc/${term2DCId}`)
          console.log('✅ Loaded Term 2 split DC:', term2DC)
          
          // Convert DC to DcOrder-like format for the dialog
          const dcOrderId = typeof term2DC.dcOrderId === 'object' ? term2DC.dcOrderId?._id : term2DC.dcOrderId
          
          // Fetch the original DcOrder for additional details
          let originalDcOrder: any = null
          if (dcOrderId) {
            try {
              originalDcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
            } catch (e) {
              console.warn('Could not fetch original DcOrder:', e)
            }
          }
          
          // Merge DC data with DcOrder data
          fullDeal = {
            ...deal,
            _id: dcOrderId || deal._id, // Use DcOrder ID for operations
            school_name: term2DC.customerName || deal.school_name || '',
            contact_person: originalDcOrder?.contact_person || deal.contact_person || '',
            contact_mobile: term2DC.customerPhone || originalDcOrder?.contact_mobile || deal.contact_mobile || '',
            email: term2DC.customerEmail || originalDcOrder?.email || deal.email || '',
            address: term2DC.customerAddress || originalDcOrder?.address || deal.address || '',
            location: originalDcOrder?.location || deal.location || '',
            zone: originalDcOrder?.zone || deal.zone || '',
            school_type: originalDcOrder?.school_type || deal.school_type || '',
            products: term2DC.productDetails || originalDcOrder?.products || deal.products || [],
            assigned_to: originalDcOrder?.assigned_to || deal.assigned_to,
            remarks: term2DC.dcRemarks || originalDcOrder?.remarks || deal.remarks || '',
            pod_proof_url: term2DC.poPhotoUrl || term2DC.poDocument || originalDcOrder?.pod_proof_url || deal.pod_proof_url,
            status: 'dc_requested', // Keep as dc_requested
            term2DCId: term2DC._id, // Store the actual DC ID
            isTerm2SplitDC: true,
          } as DcOrder
          
          // Set the existing DC to the Term 2 DC
          setExistingDC(term2DC)
        } catch (fetchError: any) {
          console.error('Could not fetch Term 2 split DC, using deal data:', fetchError?.message)
          fullDeal = deal
        }
      } else if ((deal as any).isLead) {
        // This is a closed lead, not a dc-order, so use the deal data directly
        fullDeal = deal
      } else {
        // Fetch full deal details to ensure all data is populated
        try {
          fullDeal = await apiRequest<DcOrder>(`/dc-orders/${deal._id}`)
        } catch (fetchError: any) {
          // If fetch fails (deal not found, etc.), use the deal data we have
          console.warn('Could not fetch full deal details, using list data:', fetchError?.message)
          fullDeal = deal
        }
      }
      console.log('Full deal data from API:', fullDeal)
      console.log('Existing DC for this deal:', existingDCForDeal)
      console.log('assigned_to from API:', fullDeal.assigned_to)
      console.log('assigned_to type:', typeof fullDeal.assigned_to)
      
      // Handle assigned_to - could be ObjectId string, populated object, or null/undefined
      let assignedTo = undefined
      
      // First check the fullDeal from API
      if (fullDeal.assigned_to) {
        if (typeof fullDeal.assigned_to === 'object' && fullDeal.assigned_to !== null && '_id' in fullDeal.assigned_to) {
          // Already populated object with _id
          if ('name' in fullDeal.assigned_to && fullDeal.assigned_to.name) {
            assignedTo = fullDeal.assigned_to
          } else {
            // Has _id but no name - might need to use from deal list
            assignedTo = deal.assigned_to || fullDeal.assigned_to
          }
        } else if (typeof fullDeal.assigned_to === 'string') {
          // It's an ObjectId string - try to get from the deal list (which should be populated)
          assignedTo = deal.assigned_to || { _id: fullDeal.assigned_to as string, name: 'Unknown' }
        }
      }
      
      // Fallback to deal's assigned_to from the list (which should be populated)
      if (!assignedTo && deal.assigned_to) {
        if (typeof deal.assigned_to === 'object' && deal.assigned_to !== null && '_id' in deal.assigned_to) {
          assignedTo = deal.assigned_to
        }
      }
      
      console.log('=== ASSIGNED TO DEBUG ===')
      console.log('fullDeal.assigned_to:', fullDeal.assigned_to)
      console.log('fullDeal.assigned_to type:', typeof fullDeal.assigned_to)
      console.log('deal.assigned_to:', deal.assigned_to)
      console.log('deal.assigned_to type:', typeof deal.assigned_to)
      console.log('Final processed assignedTo:', assignedTo)
      console.log('Has assigned employee?', !!assignedTo && typeof assignedTo === 'object' && '_id' in assignedTo && 'name' in assignedTo)
      
      // Normalize the deal data
      const normalizedDeal: DcOrder = {
        ...fullDeal,
        school_name: fullDeal.school_name || deal.school_name || '',
        school_type: fullDeal.school_type || deal.school_type || '',
        contact_person: fullDeal.contact_person || deal.contact_person || '',
        contact_mobile: fullDeal.contact_mobile || deal.contact_mobile || '',
        email: fullDeal.email || deal.email || '',
        address: fullDeal.address || deal.address || deal.location || '',
        location: fullDeal.location || deal.location || deal.address || '',
        zone: fullDeal.zone || deal.zone || '',
        cluster: fullDeal.cluster || deal.cluster || '',
        remarks: fullDeal.remarks || deal.remarks || '',
        dc_code: fullDeal.dc_code || deal.dc_code || '',
        products: fullDeal.products || deal.products || [],
        assigned_to: assignedTo,
      }
      
      setSelectedDeal(normalizedDeal)
      // Set selected employee if already assigned
      if (normalizedDeal.assigned_to && typeof normalizedDeal.assigned_to === 'object' && '_id' in normalizedDeal.assigned_to) {
        setSelectedEmployeeId(normalizedDeal.assigned_to._id)
      } else {
        setSelectedEmployeeId('')
      }
      // If deal has DC request data (status is 'dc_requested' or 'dc_accepted'), load it
      if ((fullDeal.status === 'dc_requested' || fullDeal.status === 'dc_accepted') && (fullDeal as any).dcRequestData) {
        const dcRequestData = (fullDeal as any).dcRequestData
        console.log('Loading DC request data:', dcRequestData)
        
        // Load DC request data into form
        setDcDate(dcRequestData.dcDate ? new Date(dcRequestData.dcDate).toISOString().split('T')[0] : '')
        setDcRemarks(dcRequestData.dcRemarks || '')
        setDcCategory(dcRequestData.dcCategory || '')
        setDcNotes(dcRequestData.dcNotes || '')
        
        // Load product rows from request data
        if (dcRequestData.productDetails && Array.isArray(dcRequestData.productDetails) && dcRequestData.productDetails.length > 0) {
          setProductRows(dcRequestData.productDetails.map((p: any, idx: number) => ({
            id: String(idx + 1),
            product: p.product || '',
            class: p.class || '1',
            category: p.category || 'New Students',
            specs: p.specs || 'Regular',
            subject: p.subject || undefined,
            strength: Number(p.strength) || 0,
            level: p.level || getDefaultLevel(p.product || 'Abacus'),
            term: p.term || 'Term 1',
          })))
        } else {
          setProductRows([{ id: '1', product: 'Abacus', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1', term: 'Term 1' }])
        }
      } else if (existingDCForDeal) {
        // Load full DC details to get all fields
        try {
          const fullDC = await apiRequest<DC>(`/dc/${existingDCForDeal._id}`)
          console.log('Loading existing DC data:', fullDC)
          console.log('DC productDetails:', fullDC.productDetails)
          console.log('DC productDetails type:', typeof fullDC.productDetails)
          console.log('DC productDetails is array?', Array.isArray(fullDC.productDetails))
          if (fullDC.productDetails && Array.isArray(fullDC.productDetails)) {
            fullDC.productDetails.forEach((p: any, idx: number) => {
              console.log(`Product ${idx + 1} RAW DATA:`, p)
              console.log(`Product ${idx + 1} DETAILS:`, {
                product: p.product,
                price: p.price,
                priceType: typeof p.price,
                total: p.total,
                totalType: typeof p.total,
                level: p.level,
                strength: p.strength,
                quantity: p.quantity,
                class: p.class,
                category: p.category,
                productName: p.productName,
              })
            })
          }
          
          setDcDate(fullDC.dcDate ? new Date(fullDC.dcDate).toISOString().split('T')[0] : '')
          setDcRemarks(fullDC.dcRemarks || '')
          setDcCategory(fullDC.dcCategory || '')
          setDcNotes(fullDC.dcNotes || '')
          
          // Load product rows from DC productDetails or DcOrder products
          // This should match EXACTLY what the employee entered in Client DC page
          if (fullDC.productDetails && Array.isArray(fullDC.productDetails) && fullDC.productDetails.length > 0) {
            console.log('=== LOADING PRODUCTS FOR CLOSED SALES ===')
            console.log('Full productDetails from DC:', JSON.stringify(fullDC.productDetails, null, 2))
            setProductRows(fullDC.productDetails.map((p: any, idx) => {
              // Read all fields directly from the product object
              // The productDetails array items should have strength, level directly on them
              const rawLevel = p.level || getDefaultLevel(p.product || 'Abacus')
              const rawStrength = p.strength !== undefined && p.strength !== null ? p.strength : 0
              
              // Convert to numbers - preserve 0 values, only default to 0 if null/undefined
              const strengthNum = rawStrength !== null && rawStrength !== undefined ? Number(rawStrength) : 0
              
              // Normalize product value to match dropdown options (case-insensitive matching)
              const rawProduct = p.product ? String(p.product).trim() : ''
              // Use the same availableProducts array defined at component level
              // Find matching product (case-insensitive)
              const matchedProduct = availableProducts.find(ap => 
                ap.toLowerCase() === rawProduct.toLowerCase() || 
                rawProduct.toLowerCase().includes(ap.toLowerCase()) ||
                ap.toLowerCase().includes(rawProduct.toLowerCase())
              ) || (rawProduct || 'ABACUS')
              
              const productRow = {
              id: String(idx + 1),
                product: matchedProduct, // Use matched product for dropdown
              class: p.class || '1',
              category: p.category || 'New Students',
                specs: p.specs || 'Regular',
                subject: p.subject || undefined,
                strength: strengthNum,
                level: rawLevel,
                term: p.term || 'Term 1',
              }
              
              console.log(`Product ${idx + 1} - Product dropdown matching:`, {
                'p.product (raw)': p.product,
                'rawProduct': rawProduct,
                'matchedProduct': matchedProduct,
                'final product (dropdown value)': productRow.product,
              })
              
              console.log(`Product ${idx + 1} - product logic:`, {
                'p.product': p.product,
                'matchedProduct': matchedProduct,
                'final product': productRow.product,
              })
              console.log(`Product ${idx + 1} RAW VALUES:`, {
                'p.strength': p.strength,
                'p.quantity': p.quantity,
                'p.level': p.level,
              })
              console.log(`Product ${idx + 1} CONVERTED:`, {
                strengthNum,
                level: rawLevel,
              })
              console.log(`Product ${idx + 1} FINAL ROW:`, JSON.stringify(productRow, null, 2))
              return productRow
            }))
          } else if (normalizedDeal.products && Array.isArray(normalizedDeal.products) && normalizedDeal.products.length > 0) {
            setProductRows(normalizedDeal.products.map((p: any, idx: number) => {
              const rawProduct = p.product_name || p.product || 'ABACUS'
              // Find matching product (case-insensitive)
              const matchedProduct = availableProducts.find(ap => 
                ap.toLowerCase() === String(rawProduct).toLowerCase() || 
                String(rawProduct).toLowerCase().includes(ap.toLowerCase()) ||
                ap.toLowerCase().includes(String(rawProduct).toLowerCase())
              ) || 'ABACUS'
              
              return {
              id: String(idx + 1),
                product: matchedProduct, // Use matched product for dropdown
              class: '1',
              category: 'New Students',
                specs: 'Regular',
                subject: undefined,
              strength: p.strength || 0,
                level: p.level || getDefaultLevel(p.product || 'Abacus'),
                term: p.term || 'Term 1',
              }
            }))
          } else {
            setProductRows([{ id: '1', product: 'ABACUS', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1' }])
          }
        } catch (e) {
          console.error('Failed to load existing DC:', e)
          // Fallback to empty form
          setDcDate('')
          setDcRemarks('')
          setDcCategory('')
          setDcNotes('')
          if (normalizedDeal.products && Array.isArray(normalizedDeal.products) && normalizedDeal.products.length > 0) {
            setProductRows(normalizedDeal.products.map((p: any, idx: number) => ({
              id: String(idx + 1),
              product: p.product_name || 'Abacus',
              class: '1',
              category: 'New Students',
              specs: 'Regular',
              subject: undefined,
              strength: p.strength || 0,
              level: p.level || 'L2',
              term: p.term || 'Term 1',
            })))
          } else {
            setProductRows([{ id: '1', product: 'Abacus', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1', term: 'Term 1' }])
          }
        }
      } else {
        // No existing DC, start with fresh form
        setDcDate('')
        setDcRemarks('')
        setDcCategory('')
        setDcNotes('')
        // Initialize product rows from existing products in deal, or start with one empty row
        if (normalizedDeal.products && Array.isArray(normalizedDeal.products) && normalizedDeal.products.length > 0) {
          setProductRows(normalizedDeal.products.map((p: any, idx: number) => ({
            id: String(idx + 1),
            product: p.product_name || 'Abacus',
            class: '1',
            category: 'New Students',
            specs: 'Regular',
            subject: undefined,
            strength: p.strength || 0,
            level: p.level || 'L2',
          })))
        } else {
          setProductRows([{ id: '1', product: 'Abacus', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1', term: 'Term 1' }])
        }
      }
      setOpenRaiseDCDialog(true)
      
      console.log('Normalized deal for modal:', normalizedDeal)
      console.log('Final assigned_to in normalized deal:', normalizedDeal.assigned_to)
    } catch (e: any) {
      console.error('Failed to load deal details:', e)
      // Fallback to using the deal data we have
      setSelectedDeal(deal)
      setOpenRaiseDCDialog(true)
      
      // Initialize form with deal data
      setDcDate('')
      setDcRemarks('')
      setDcCategory('')
      setDcNotes('')
      if (deal.products && Array.isArray(deal.products) && deal.products.length > 0) {
        setProductRows(deal.products.map((p: any, idx: number) => ({
          id: String(idx + 1),
          product: p.product_name || 'Abacus',
          class: '1',
          category: 'New Students',
          specs: 'Regular',
          subject: undefined,
          strength: p.strength || 0,
          level: p.level || 'L2',
          term: p.term || 'Term 1',
        })))
      } else {
        setProductRows([{ id: '1', product: 'Abacus', class: '1', category: 'New Students', specs: 'Regular', strength: 0, level: 'L1' }])
      }
      
      const errorMessage = e?.message || 'Unknown error'
      if (errorMessage.includes('Cannot connect to backend')) {
        toast.error('Cannot connect to backend server. Please check your connection or contact support.')
      } else if (errorMessage.includes('not found') || errorMessage.includes('DC not found')) {
        // Don't show warning for "not found" errors - this is expected for some deals
        console.log('Deal not found in API, using list data (this is normal for some deals)')
      } else {
        toast.warning(`Could not load full deal details: ${errorMessage}. Using available data.`)
      }
    }
  }

  const openViewLocation = (deal: DcOrder) => {
    setSelectedDeal(deal)
    setOpenLocationDialog(true)
  }

  const handleSubmitToManager = async () => {
    if (!selectedDeal) return

    // Check if employee is assigned - prioritize deal's assigned employee
    let employeeId = null
    
    // First, check if deal already has an assigned employee
    if (selectedDeal.assigned_to) {
      if (typeof selectedDeal.assigned_to === 'object' && '_id' in selectedDeal.assigned_to) {
        employeeId = selectedDeal.assigned_to._id
      } else if (typeof selectedDeal.assigned_to === 'string') {
        employeeId = selectedDeal.assigned_to
      }
    }
    
    // If no employee from deal, use the selected employee from dropdown (only if deal doesn't have one)
    if (!employeeId && selectedEmployeeId) {
      employeeId = selectedEmployeeId
    }

    // Only require employee assignment if deal truly doesn't have one
    if (!employeeId) {
      alert('Please assign an employee before submitting to Senior Coordinator')
      return
    }

    setSubmitting(true)
    try {
      // First, raise DC (creates or gets existing DC)
      const raisePayload: any = {
        dcOrderId: selectedDeal._id,
        dcDate: dcDate || undefined,
        dcRemarks: dcRemarks || undefined,
      }
      
      // Only include employeeId if deal doesn't already have one assigned (backend will use deal's assigned_to if available)
      if (!selectedDeal.assigned_to && employeeId) {
        raisePayload.employeeId = employeeId
      }

      // Calculate requested quantity from product rows (using strength)
      const totalQuantity = productRows.reduce((sum, row) => sum + (row.strength || 0), 0)
      raisePayload.requestedQuantity = totalQuantity || 1
      
      // Include product details in payload
      raisePayload.productDetails = productRows.map(row => ({
        product: row.product,
        class: row.class,
        category: row.category,
        specs: row.specs || 'Regular',
        subject: row.subject || undefined,
        strength: Number(row.strength) || 0,
        quantity: Number(row.strength) || 0, // Quantity should match strength
        level: row.level || 'L2',
        term: row.term || 'Term 1',
      }))

      // Set status to pending_dc when raising from Closed Sales
      // Status will only change to sent_to_manager when "Submit to Warehouse" is pressed in Pending DC page
      raisePayload.status = 'pending_dc'

      let dc: DC
      
      // If DC exists, update it; otherwise create new one
      if (existingDC) {
        // Update existing DC
        await apiRequest(`/dc/${existingDC._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...raisePayload,
            requestedQuantity: totalQuantity || 1, // Explicitly set requestedQuantity
            financeRemarks: raisePayload.financeRemarks,
            splApproval: raisePayload.splApproval,
            dcDate: raisePayload.dcDate,
            dcRemarks: raisePayload.dcRemarks,
            dcCategory: raisePayload.dcCategory,
            productDetails: raisePayload.productDetails,
            status: 'pending_dc', // Set status to pending_dc
          }),
        })
        dc = existingDC
      } else {
        // Create new DC
        dc = await apiRequest<DC>(`/dc/raise`, {
          method: 'POST',
          body: JSON.stringify(raisePayload),
        })
      }

      alert(existingDC ? 'DC updated and sent to Senior Coordinator successfully! It will appear in Pending DC list.' : 'DC created and sent to Senior Coordinator successfully! It will appear in Pending DC list.')
      setOpenRaiseDCDialog(false)
      // Reload to refresh the DC map
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to submit to Senior Coordinator')
    } finally {
      setSubmitting(false)
    }
  }

  // Employee submits DC request (doesn't create DC, just requests it)
  const handleRequestDC = async () => {
    if (!selectedDeal) return

    // Check if employee is assigned - prioritize deal's assigned employee
    let employeeId = null
    
    // First, check if deal already has an assigned employee
    if (selectedDeal.assigned_to) {
      if (typeof selectedDeal.assigned_to === 'object' && '_id' in selectedDeal.assigned_to) {
        employeeId = selectedDeal.assigned_to._id
      } else if (typeof selectedDeal.assigned_to === 'string') {
        employeeId = selectedDeal.assigned_to
      }
    }
    
    // If no employee from deal, use the selected employee from dropdown (only if deal doesn't have one)
    if (!employeeId && selectedEmployeeId) {
      employeeId = selectedEmployeeId
    }

    // Only require employee assignment if deal truly doesn't have one
    if (!employeeId) {
      alert('Please assign an employee before requesting DC')
      return
    }

    setSaving(true)
    try {
      // Calculate requested quantity from product rows (using strength)
      const totalQuantity = productRows.reduce((sum, row) => sum + (row.strength || 0), 0)
      
      // Prepare DC request data to store in DcOrder
      const dcRequestData = {
        dcDate: dcDate || undefined,
        dcRemarks: dcRemarks || undefined,
        dcCategory: dcCategory || undefined,
        requestedQuantity: totalQuantity || 1,
        productDetails: productRows.map(row => ({
          product: row.product,
          class: row.class,
          category: row.category,
          specs: row.specs || 'Regular',
          subject: row.subject || undefined,
          strength: Number(row.strength) || 0,
          quantity: Number(row.strength) || 0, // Quantity should match strength
          level: row.level || getDefaultLevel(row.product || 'Abacus'),
          term: row.term || 'Term 1',
        })),
        employeeId: employeeId,
      }

      // Update DcOrder with DC request data and set status to 'dc_requested'
      await apiRequest(`/dc-orders/${selectedDeal._id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'dc_requested',
          dcRequestData: dcRequestData, // Store request data for coordinator to review
        }),
      })

      alert('DC request submitted successfully! Coordinator/Admin will review and approve it.')
      setOpenRaiseDCDialog(false)
      // Reload to refresh the list
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to submit DC request')
    } finally {
      setSaving(false)
    }
  }

  // Coordinator/Admin accepts DC request and creates/updates DC (but keeps it in Closed Sales for later updates)
  const handleAcceptDC = async () => {
    if (!selectedDeal) return

    setSaving(true)
    try {
      // Get DC request data from DcOrder (or use current form data if it's an accepted request being updated)
      const dcRequestData = (selectedDeal as any).dcRequestData || {}
      
      // Use current form data if available (for updates), otherwise use request data, otherwise use deal's products
      const finalDcDate = dcDate || (dcRequestData.dcDate ? new Date(dcRequestData.dcDate).toISOString().split('T')[0] : undefined)
      const finalDcRemarks = dcRemarks || dcRequestData.dcRemarks || undefined
      const finalDcCategory = dcCategory || dcRequestData.dcCategory || undefined
      
      // Determine product details: use form data if available, otherwise request data, otherwise deal's products
      let finalProductDetails: any[] = []
      if (productRows.length > 0) {
        finalProductDetails = productRows.map(row => ({
        product: row.product,
        class: row.class,
        category: row.category,
        specs: row.specs || 'Regular',
        subject: row.subject || undefined,
          strength: Number(row.strength) || 0,
          quantity: Number(row.strength) || 0, // Quantity should match strength
          level: row.level || getDefaultLevel(row.product || 'Abacus'),
          term: row.term || 'Term 1',
        }))
      } else if (dcRequestData.productDetails && Array.isArray(dcRequestData.productDetails) && dcRequestData.productDetails.length > 0) {
        finalProductDetails = dcRequestData.productDetails
      } else if (selectedDeal.products && Array.isArray(selectedDeal.products) && selectedDeal.products.length > 0) {
        // Fallback to deal's products if no form data or request data
        finalProductDetails = selectedDeal.products.map((p: any) => ({
          product: p.product_name || 'Abacus',
          class: '1',
          category: 'New Students',
          productName: p.product_name || 'Abacus',
          quantity: p.quantity || 1,
          strength: 0,
          level: getDefaultLevel(p.product_name || 'Abacus'),
        }))
      }
      
      const finalRequestedQuantity = finalProductDetails.length > 0
        ? finalProductDetails.reduce((sum: number, p: any) => sum + (Number(p.quantity) || Number(p.strength) || 0), 0)
        : 1
      
      // Prepare payload to create/update DC
      const raisePayload: any = {
        dcOrderId: selectedDeal._id,
        dcDate: finalDcDate || undefined,
        dcRemarks: finalDcRemarks,
        dcCategory: finalDcCategory,
        requestedQuantity: finalRequestedQuantity,
        productDetails: finalProductDetails,
      }

      // Include employeeId from request data or deal
      if (dcRequestData.employeeId) {
        raisePayload.employeeId = dcRequestData.employeeId
      } else if (selectedDeal.assigned_to) {
        const employeeId = typeof selectedDeal.assigned_to === 'object' 
          ? selectedDeal.assigned_to._id 
          : selectedDeal.assigned_to
        if (employeeId) {
          raisePayload.employeeId = employeeId
        }
      }

      let dc: DC
      
      // If DC exists, update it; otherwise create new one
      if (existingDC) {
        // Update existing DC
        await apiRequest(`/dc/${existingDC._id}`, {
          method: 'PUT',
          body: JSON.stringify(raisePayload),
        })
        dc = existingDC
      } else {
        // Create new DC
        dc = await apiRequest<DC>(`/dc/raise`, {
          method: 'POST',
          body: JSON.stringify(raisePayload),
        })
      }

      // Update DcOrder status to 'dc_accepted' (keeps it in closed sales for later updates)
      // Also update dcRequestData with current form data for future reference
      await apiRequest(`/dc-orders/${selectedDeal._id}`, {
          method: 'PUT',
          body: JSON.stringify({
          status: 'dc_accepted',
          dcRequestData: {
            dcDate: finalDcDate,
            dcRemarks: finalDcRemarks,
            dcNotes: finalDcNotes,
            dcCategory: finalDcCategory,
            requestedQuantity: finalRequestedQuantity,
            productDetails: finalProductDetails,
            employeeId: raisePayload.employeeId,
          },
        }),
      })

      alert('DC request accepted! DC has been created/updated. You can update it later or submit to Senior Coordinator.')
      setOpenRaiseDCDialog(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to accept DC request')
    } finally {
      setSaving(false)
    }
  }

  // Coordinator/Admin sends DC request to Senior Coordinator (Pending DC)
  const handleSendToSeniorCoordinator = async () => {
    if (!selectedDeal) return

    setSaving(true)
    try {
      // Check if this is a Term 2 split DC
      const isTerm2SplitDC = (selectedDeal as any).isTerm2SplitDC
      const term2DCId = (selectedDeal as any).term2DCId
      
      // Get DC request data from DcOrder
      const dcRequestData = (selectedDeal as any).dcRequestData || {}
      
      // Prepare payload to create DC and submit to manager
      // Always use current productRows to ensure term changes are saved
      const raisePayload: any = {
        dcOrderId: selectedDeal._id, // Use DcOrder ID (will be resolved from term2DCId if needed)
        dcDate: dcRequestData.dcDate || dcDate || undefined,
        dcRemarks: dcRequestData.dcRemarks || dcRemarks || undefined,
        dcCategory: dcRequestData.dcCategory || dcCategory || undefined,
        requestedQuantity: productRows.length > 0 
          ? productRows.reduce((sum, row) => sum + (row.strength || 0), 0) || 1
          : (dcRequestData.requestedQuantity || 1),
        productDetails: productRows.length > 0 
          ? productRows.map(row => ({
              product: row.product,
              class: row.class,
              category: row.category,
              specs: row.specs || 'Regular',
              subject: row.subject || undefined,
              strength: Number(row.strength) || 0,
              quantity: Number(row.strength) || 0, // Quantity should match strength
              level: row.level || getDefaultLevel(row.product || 'Abacus'),
              term: row.term || 'Term 1',
            }))
          : (dcRequestData.productDetails || []),
      }

      // Include employeeId from request data
      if (dcRequestData.employeeId) {
        raisePayload.employeeId = dcRequestData.employeeId
      }

      // Set status to pending_dc when raising from Closed Sales
      // Status will only change to sent_to_manager when "Submit to Warehouse" is pressed in Pending DC page
      raisePayload.status = 'pending_dc'

      // Create or update DC
      let dc: DC
      if (isTerm2SplitDC && term2DCId && existingDC) {
        // This is a Term 2 split DC - update the existing Term 2 DC
        console.log('📦 Updating Term 2 split DC:', term2DCId)
        await apiRequest(`/dc/${term2DCId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...raisePayload,
            status: 'pending_dc', // Change from scheduled_for_later to pending_dc
          }),
        })
        dc = existingDC
      } else if (existingDC) {
        await apiRequest(`/dc/${existingDC._id}`, {
          method: 'PUT',
          body: JSON.stringify(raisePayload),
        })
        dc = existingDC
      } else {
        dc = await apiRequest<DC>(`/dc/raise`, {
          method: 'POST',
          body: JSON.stringify(raisePayload),
        })
      }

      // Update DcOrder status to 'dc_sent_to_senior' (removes from closed sales)
      await apiRequest(`/dc-orders/${selectedDeal._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'dc_sent_to_senior' }),
      })

      alert('DC request sent to Senior Coordinator! It will appear in Pending DC list.')
      setOpenRaiseDCDialog(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Failed to send to Senior Coordinator')
    } finally {
      setSaving(false)
    }
  }

  // Get products display string
  const getProductsDisplay = (deal: DcOrder) => {
    if (!deal.products || !Array.isArray(deal.products)) return '-'
    return deal.products.map(p => `${p.product_name}${p.quantity ? ` - ${p.quantity}` : ''}`).join(', ')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6">Closed Leads List</h1>
      
      {/* Search/Filter Section */}
      <Card className="p-5 shadow-sm border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="By School Name" />
          <Input placeholder="By Contact Mobile No" />
          <Input type="date" placeholder="From Date" />
          <Input type="date" placeholder="To Date" />
          <Input placeholder="Select Zone" />
          <Input placeholder="Select Executive" />
          <Input placeholder="By Town" />
          <Button className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm">Search</Button>
        </div>
      </Card>

      <Card className="p-0 overflow-x-auto shadow-sm border-slate-200">
        {loading && <div className="p-6 text-slate-600">Loading...</div>}
        {!loading && items.length === 0 && <div className="p-6 text-slate-500">No closed deals found.</div>}
        {!loading && items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                <th className="py-3 px-4 text-left font-semibold text-sm">Created On</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">School Type</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">Zone</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">Town</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">School Code</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">School Name</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">Executive</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">Mobile</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">Products</th>
                <th className="py-3 px-4 text-left font-semibold text-sm">PO</th>
                <th className="py-3 px-4 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-700">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : 
                     d.createdAt ? new Date(d.createdAt).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{d.school_type || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{d.zone || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{d.location || d.address?.split(',')[0] || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium text-blue-700">{d.school_code || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{d.school_name || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{d.assigned_to?.name || '-'}</td>
                  <td className="py-3 px-4 text-slate-700">{d.contact_mobile || '-'}</td>
                  <td className="py-3 px-4 text-slate-700 text-xs">{getProductsDisplay(d)}</td>
                  <td className="py-3 px-4">
                    {(() => {
                      // Check for PO photo in pod_proof_url or in associated DC
                      const dc = dealDCs[d._id] as any
                      const poUrl = d.pod_proof_url || dc?.poPhotoUrl || dc?.poDocument
                      
                      if (poUrl) {
                        // Check if it's a PDF
                        const isPDF = poUrl.toLowerCase().endsWith('.pdf') || 
                                     poUrl.includes('application/pdf') ||
                                     (poUrl.startsWith('data:') && poUrl.includes('application/pdf'))
                        
                        if (isPDF) {
                          // Show PDF icon/button
                          return (
                            <div className="flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setSelectedPOPhotoUrl(poUrl)
                                  setOpenPOPhotoDialog(true)
                                }}
                              >
                                View PO
                              </Button>
                            </div>
                          )
                        } else {
                          // Show image thumbnail
                          return (
                            <div className="flex items-center justify-center">
                              <img
                                src={poUrl}
                                alt="PO Document"
                                className="w-14 h-14 object-contain rounded border border-slate-200 cursor-pointer hover:opacity-75 hover:border-slate-400 transition-all shadow-sm bg-white p-1"
                                onClick={() => {
                                  setSelectedPOPhotoUrl(poUrl)
                                  setOpenPOPhotoDialog(true)
                                }}
                                title="Click to view full size"
                                onError={(e) => {
                                  // If image fails to load, show a button instead
                                  const target = e.currentTarget
                                  target.style.display = 'none'
                                  const parent = target.parentElement
                                  if (parent) {
                                    const button = document.createElement('button')
                                    button.className = 'text-xs text-slate-600 hover:text-slate-800 underline cursor-pointer px-2 py-1 border rounded'
                                    button.textContent = 'View PO'
                                    button.onclick = (ev) => {
                                      ev.preventDefault()
                                      setSelectedPOPhotoUrl(poUrl)
                                      setOpenPOPhotoDialog(true)
                                      return false
                                    }
                                    parent.appendChild(button)
                                  }
                                }}
                              />
                            </div>
                          )
                        }
                      } else {
                        return <span className="text-xs text-slate-400">-</span>
                      }
                    })()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1.5">
                      {/* Show Raise DC button for both DcOrders and closed leads */}
                      {(canRequestDC || canApproveDC) && (
                        <Button
                          size="sm"
                          variant={d.status === 'dc_accepted' ? 'default' : 'destructive'}
                          className={
                            d.status === 'dc_accepted' 
                              ? '!bg-blue-600 hover:!bg-blue-700 !text-white !shadow-sm !from-blue-600 !to-blue-700 hover:!from-blue-700 hover:!to-blue-800' 
                              : ''
                          }
                          onClick={() => openRaiseDC(d)}
                        >
                          {d.status === 'dc_requested' ? 'Raise DC' : d.status === 'dc_accepted' ? 'Update DC' : 'Raise DC'}
                        </Button>
                      )}
                      {!isManager && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 hover:bg-slate-50 text-slate-700"
                          onClick={() => openViewLocation(d)}
                        >
                          View Location
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Raise DC Modal */}
      <Dialog open={openRaiseDCDialog} onOpenChange={setOpenRaiseDCDialog}>
        <DialogContent 
          className="sm:max-w-[95vw] lg:max-w-[1200px] max-h-[95vh] overflow-y-auto bg-white border-slate-200 shadow-xl"
          showCloseButton={true}
        >
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-slate-900 text-xl font-semibold">
              {selectedDeal?.school_name || 'Client'} - {
                selectedDeal?.status === 'dc_requested' ? 'Raise DC' : 
                selectedDeal?.status === 'dc_accepted' ? 'Update DC' : 
                'Raise DC'
              }
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm mt-1">
              {selectedDeal?.status === 'dc_requested' 
                ? 'Review DC request from employee. You can accept it (to update later) or send to Senior Coordinator.'
                : selectedDeal?.status === 'dc_accepted'
                ? 'Update DC details. You can save changes or submit to Senior Coordinator.'
                : canRequestDC 
                  ? 'Fill in DC details and submit request for Coordinator/Admin approval'
                  : 'Fill in DC details and submit to Manager'}
            </DialogDescription>
          </DialogHeader>
          {selectedDeal ? (
            <div className="space-y-6 py-6">
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <strong>Debug:</strong> School: {selectedDeal.school_name || 'EMPTY'}, Contact: {selectedDeal.contact_person || 'EMPTY'}, Products: {selectedDeal.products?.length || 0}
                </div>
              )}
              {/* Lead Information and More Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Lead Information */}
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl mb-2">Lead Information</h3>
                    <p className="text-sm text-slate-500">Client and contact details</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">School Type</Label>
                    <Input 
                      value={selectedDeal.school_type || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="School Type"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">School Name</Label>
                    <Input 
                      value={selectedDeal.school_name || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="School Name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">School Code</Label>
                    <Input 
                      value={selectedDeal.dc_code || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="School Code"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Contact Person Name</Label>
                    <Input 
                      value={selectedDeal.contact_person || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Contact Person Name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Contact Mobile</Label>
                    <Input 
                      value={selectedDeal.contact_mobile || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Contact Mobile"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Assigned To</Label>
                    {(() => {
                      // Check if deal has assigned employee - be more lenient with the check
                      const assignedTo = selectedDeal.assigned_to
                      
                      // Check if we have a valid assigned employee
                      let hasAssignedEmployee = false
                      let employeeName = ''
                      
                      if (assignedTo) {
                        if (typeof assignedTo === 'object' && assignedTo !== null) {
                          // It's an object - check if it has name or _id
                          if ('name' in assignedTo && assignedTo.name) {
                            hasAssignedEmployee = true
                            employeeName = String(assignedTo.name)
                          } else if ('_id' in assignedTo) {
                            // Has _id but might not have name - still consider it assigned
                            hasAssignedEmployee = true
                            employeeName = 'Employee (ID: ' + String(assignedTo._id) + ')'
                          }
                        } else if (typeof assignedTo === 'string') {
                          // It's a string ID - not ideal but if it exists, try to find name
                          hasAssignedEmployee = false // Will show dropdown but pre-select
                        }
                      }
                      
                      console.log('Modal - assignedTo:', assignedTo)
                      console.log('Modal - hasAssignedEmployee:', hasAssignedEmployee)
                      console.log('Modal - employeeName:', employeeName)
                      
                      if (hasAssignedEmployee && employeeName) {
                        // Show assigned employee name (read-only)
                        return (
                          <Input 
                            value={employeeName} 
                            disabled 
                            className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                            placeholder="Assigned To"
                          />
                        )
                      } else {
                        // Show dropdown if no employee is assigned
                        return (
                          <>
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} required>
                              <SelectTrigger className="bg-white text-slate-900 border-slate-200 h-11 text-sm">
                                <SelectValue placeholder="Select Employee *" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.length === 0 ? (
                                  <div className="px-2 py-1.5 text-sm text-slate-500">Loading employees...</div>
                                ) : (
                                  employees.map((emp) => (
                                    <SelectItem key={emp._id} value={emp._id}>
                                      {emp.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {!selectedEmployeeId && (
                              <p className="text-xs text-red-500 mt-1">Please assign an employee to continue</p>
                            )}
                          </>
                        )
                      }
                    })()}
                  </div>
                </div>

                {/* More Information */}
                <div className="space-y-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl mb-2">More Information</h3>
                    <p className="text-sm text-slate-500">Additional location and details</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Town</Label>
                    <Input 
                      value={selectedDeal.location || selectedDeal.address?.split(',')[0] || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Town"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Address</Label>
                    <Textarea 
                      value={selectedDeal.address || selectedDeal.location || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 text-sm" 
                      rows={4} 
                      placeholder="Address"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Zone</Label>
                    <Input 
                      value={selectedDeal.zone || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Zone"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Cluster</Label>
                    <Input 
                      value={selectedDeal.cluster || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Cluster"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Remarks</Label>
                    <Textarea 
                      value={selectedDeal.remarks || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 text-sm" 
                      rows={3} 
                      placeholder="Remarks"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery and Address Section */}
              <div className="border-t border-slate-200 pt-6 mt-6">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 text-xl mb-2">Delivery and Address</h3>
                  <p className="text-sm text-slate-500">Delivery address details for this order</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Property Number</Label>
                    <Input 
                      value={selectedDeal.property_number || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Property Number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Floor</Label>
                    <Input 
                      value={selectedDeal.floor || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Floor"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Tower/Block</Label>
                    <Input 
                      value={selectedDeal.tower_block || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Tower/Block"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Nearby Landmark</Label>
                    <Input 
                      value={selectedDeal.nearby_landmark || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Nearby Landmark"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Area</Label>
                    <Input 
                      value={selectedDeal.area || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Area"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">City</Label>
                    <Input 
                      value={selectedDeal.city || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Pincode</Label>
                    <Input 
                      value={selectedDeal.pincode || ''} 
                      disabled 
                      className="bg-slate-50 text-slate-900 border-slate-200 h-11 text-sm" 
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Products Table - Where quantities are added */}
              <div className="border-t border-slate-200 pt-8 mt-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <Label className="text-xl font-bold text-slate-900">Products & Quantities</Label>
                    <p className="text-sm text-slate-500 mt-1">Add products and specify quantities and other details</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                    onClick={() => {
                      const defaultProduct = 'ABACUS'
                      const defaultCat = hasProductCategories(defaultProduct) 
                        ? (getProductCategories(defaultProduct)[0] || defaultCategories[0])
                        : defaultCategories[0]
                      setProductRows([...productRows, {
                        id: Date.now().toString(),
                        product: defaultProduct,
                        class: '1',
                        category: defaultCat,
                        specs: 'Regular',
                        subject: undefined,
                        strength: 0,
                        level: getDefaultLevel(defaultProduct),
                        term: 'Term 1'
                      }])
                    }}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Row
                  </Button>
                </div>
                
                <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-300">
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Product</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Term</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Class</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Category</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Specs</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Subject</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Quantity</th>
                        <th className="py-4 px-5 text-left text-slate-700 font-bold text-xs uppercase tracking-wider">Level</th>
                        <th className="py-4 px-5 text-center text-slate-700 font-bold text-xs uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productRows.map((row, idx) => (
                        <tr key={row.id} className="bg-white hover:bg-blue-50/30 transition-all duration-150 border-b border-slate-100">
                          <td className="py-4 px-5">
                            <Select value={row.product} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].product = v
                              updated[idx].level = getDefaultLevel(v)
                              // Set default category: use first product category if available, otherwise first default category
                              if (hasProductCategories(v)) {
                                const productCats = getProductCategories(v)
                                updated[idx].category = productCats[0] || defaultCategories[0]
                              } else {
                                updated[idx].category = defaultCategories[0]
                              }
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map(p => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5">
                            <Select value={row.term || 'Term 1'} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].term = v
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Term 1">Term 1</SelectItem>
                                <SelectItem value="Term 2">Term 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5">
                            <Select value={row.class} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].class = v
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableClasses.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5">
                            <Select value={row.category} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].category = v
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {hasProductCategories(row.product) ? (
                                  getProductCategories(row.product).map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))
                                ) : (
                                  defaultCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5">
                            <Select value={row.specs || 'Regular'} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].specs = v
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getProductSpecs(row.product).map(spec => (
                                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5">
                            {getProductSubjects(row.product).length > 0 ? (
                              <Select value={row.subject || ''} onValueChange={(v) => {
                                const updated = [...productRows]
                                updated[idx].subject = v
                                setProductRows(updated)
                              }}>
                                <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500">
                                  <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getProductSubjects(row.product).map(subject => (
                                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <Input
                              type="number"
                              className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 w-24"
                              value={row.strength || ''}
                              onChange={(e) => {
                                const updated = [...productRows]
                                updated[idx].strength = Number(e.target.value) || 0
                                setProductRows(updated)
                              }}
                              placeholder="0"
                              min="0"
                            />
                          </td>
                          <td className="py-4 px-5">
                            <Select value={row.level || 'L2'} onValueChange={(v) => {
                              const updated = [...productRows]
                              updated[idx].level = v
                              setProductRows(updated)
                            }}>
                              <SelectTrigger className="h-9 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableLevels(row.product).map(level => (
                                  <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-4 px-5 text-center">
                            {productRows.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0 rounded-full transition-all duration-200"
                                onClick={() => {
                                  setProductRows(productRows.filter((_, i) => i !== idx))
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-200 border-t-2 border-slate-400 font-bold">
                        <td colSpan={6} className="px-5 py-4 text-right">
                          <span className="text-slate-800 text-base">Grand Total:</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-slate-800 text-base">
                            {productRows.reduce((sum, row) => sum + (Number(row.strength) || 0), 0)}
                          </span>
                        </td>
                        <td colSpan={2} className="px-5 py-4"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DC Details */}
              <div className="space-y-6 border-t border-slate-200 pt-8 mt-8">
                <div>
                  <h3 className="font-bold text-slate-900 text-xl mb-2">DC Details</h3>
                  <p className="text-sm text-slate-500">Enter delivery challan information</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-lg border border-slate-200">
                  <div>
                    <Label className="text-sm font-semibold mb-2.5 block text-slate-700">DC Date *</Label>
                    <Input
                      type="date"
                      value={dcDate}
                      onChange={(e) => setDcDate(e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className="h-11 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2.5 block text-slate-700">DC Category *</Label>
                    <Select value={dcCategory} onValueChange={setDcCategory}>
                      <SelectTrigger className="h-11 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 bg-white">
                        <SelectValue placeholder="Select DC Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Term 1">Term 1</SelectItem>
                        <SelectItem value="Term 2">Term 2</SelectItem>
                        <SelectItem value="Term 3">Term 3</SelectItem>
                        <SelectItem value="Full Year">Full Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2.5 block text-slate-700">DC Remarks</Label>
                    <Input
                      value={dcRemarks}
                      onChange={(e) => setDcRemarks(e.target.value)}
                      placeholder="Enter remarks"
                      className="h-11 text-sm border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <DialogFooter className="flex justify-between items-center border-t border-slate-200 pt-6 mt-4">
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                    onClick={() => setOpenRaiseDCDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="flex gap-2">
                  {/* Employee: Show "Raise DC" button to request DC */}
                  {canRequestDC && selectedDeal?.status !== 'dc_requested' && selectedDeal?.status !== 'dc_accepted' && (
                  <Button
                      variant="destructive"
                      onClick={handleRequestDC}
                      disabled={saving || submitting}
                    >
                      {saving ? 'Submitting...' : 'Raise DC'}
                    </Button>
                  )}
                  
                  {/* Coordinator/Admin: Show "Accept" and "Send to Senior Coordinator" buttons for DC requests */}
                  {canApproveDC && selectedDeal?.status === 'dc_requested' && (
                    <>
                      <Button
                    variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50 shadow-sm"
                        onClick={handleAcceptDC}
                        disabled={saving || submitting}
                      >
                        {saving ? 'Processing...' : 'Accept'}
                  </Button>
                      <Button
                        className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        onClick={handleSendToSeniorCoordinator}
                        disabled={submitting || saving}
                      >
                        {submitting ? 'Sending...' : 'Send to Senior Coordinator'}
                      </Button>
                    </>
                  )}
                  
                  {/* Coordinator/Admin: Show "Update" and "Send to Senior Coordinator" buttons for accepted DCs */}
                  {canApproveDC && selectedDeal?.status === 'dc_accepted' && (
                    <>
                  <Button
                    variant="default"
                        className="!bg-blue-600 hover:!bg-blue-700 !text-white !shadow-sm !from-blue-600 !to-blue-700 hover:!from-blue-700 hover:!to-blue-800"
                        onClick={handleAcceptDC}
                    disabled={saving || submitting}
                  >
                        {saving ? 'Updating...' : 'Update DC'}
                  </Button>
                  <Button
                    className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        onClick={handleSendToSeniorCoordinator}
                    disabled={submitting || saving}
                  >
                        {submitting ? 'Sending...' : 'Send to Senior Coordinator'}
                  </Button>
                    </>
                  )}
                  
                  {/* Coordinator/Admin: Show "Accept" and "Send to Senior Coordinator" buttons for other deals (not requested yet) */}
                  {canApproveDC && selectedDeal?.status !== 'dc_requested' && selectedDeal?.status !== 'dc_accepted' && (
                    <>
                  <Button
                    variant="outline"
                        className="border-green-600 text-green-700 hover:bg-green-50 shadow-sm"
                        onClick={handleAcceptDC}
                    disabled={saving || submitting}
                  >
                        {saving ? 'Processing...' : 'Accept'}
                  </Button>
                  <Button
                    className="bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                        onClick={handleSendToSeniorCoordinator}
                    disabled={submitting || saving}
                  >
                        {submitting ? 'Sending...' : 'Send to Senior Coordinator'}
                  </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p>Loading deal details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Location Modal */}
      <Dialog open={openLocationDialog} onOpenChange={setOpenLocationDialog}>
        <DialogContent className="sm:max-w-[600px] border-slate-200 shadow-xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-slate-900 text-xl font-semibold">View Location</DialogTitle>
            <DialogDescription className="text-slate-600 text-sm mt-1">
              Location details for {selectedDeal?.school_name || 'this deal'}
            </DialogDescription>
          </DialogHeader>
          {selectedDeal && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Address</Label>
                <Textarea value={selectedDeal.address || selectedDeal.location || 'N/A'} disabled rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Zone</Label>
                  <Input value={selectedDeal.zone || '-'} disabled />
                </div>
                <div>
                  <Label>Location/Town</Label>
                  <Input value={selectedDeal.location || '-'} disabled />
                </div>
              </div>
              {selectedDeal.address && (
                <div>
                  <Label>Map</Label>
                  <div className="mt-2 p-4 bg-slate-100 rounded text-center text-sm text-slate-500 border border-slate-200">
                    Map view would be integrated here
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm" 
              onClick={() => setOpenLocationDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Photo Modal */}
      <Dialog open={openPOPhotoDialog} onOpenChange={setOpenPOPhotoDialog}>
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw] max-h-[90vh] overflow-auto bg-white border-slate-200 shadow-xl">
          <DialogHeader className="pb-4 border-b border-slate-200">
            <DialogTitle className="text-slate-900 text-xl font-semibold">
              Purchase Order (PO) Document
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm mt-1">
              View full-size PO document
            </DialogDescription>
          </DialogHeader>
          {selectedPOPhotoUrl && (() => {
            // Check if it's a PDF
            const isPDF = selectedPOPhotoUrl.toLowerCase().endsWith('.pdf') || 
                         selectedPOPhotoUrl.includes('application/pdf') ||
                         (selectedPOPhotoUrl.startsWith('data:') && selectedPOPhotoUrl.includes('application/pdf'))
            
            if (isPDF) {
              // Display PDF in iframe
              return (
                <div className="py-4 flex items-center justify-center bg-slate-50 rounded-lg">
                  <iframe
                    src={selectedPOPhotoUrl}
                    className="w-full h-[70vh] rounded-lg shadow-lg border border-slate-200"
                    title="PO Document PDF"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              )
            } else {
              // Display image
              return (
                <div className="py-4 flex items-center justify-center bg-slate-50 rounded-lg">
                  <img
                    src={selectedPOPhotoUrl}
                    alt="PO Document Full Size"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg border border-slate-200"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="text-center p-8">
                            <p class="text-red-600 mb-4">Failed to load document</p>
                            <a href="${selectedPOPhotoUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">
                              Open in new tab
                            </a>
                          </div>
                        `
                      }
                    }}
                  />
                </div>
              )
            }
          })()}
          <DialogFooter className="pt-4 border-t border-slate-200">
            <div className="flex gap-2 justify-between w-full">
              <Button
                variant="outline"
                className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                onClick={() => {
                  if (selectedPOPhotoUrl) {
                    // For data URLs, create a blob and open it
                    if (selectedPOPhotoUrl.startsWith('data:')) {
                      const byteString = atob(selectedPOPhotoUrl.split(',')[1])
                      const mimeString = selectedPOPhotoUrl.split(',')[0].split(':')[1].split(';')[0]
                      const ab = new ArrayBuffer(byteString.length)
                      const ia = new Uint8Array(ab)
                      for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i)
                      }
                      const blob = new Blob([ab], { type: mimeString })
                      const url = URL.createObjectURL(blob)
                      window.open(url, '_blank')
                    } else {
                      window.open(selectedPOPhotoUrl, '_blank')
                    }
                  }
                }}
              >
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm"
                onClick={() => setOpenPOPhotoDialog(false)}
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}