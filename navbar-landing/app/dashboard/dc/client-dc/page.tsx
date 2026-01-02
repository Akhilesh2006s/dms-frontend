'use client'

import { useEffect, useState, useMemo } from 'react'
import { apiRequest } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Package, Plus, Upload, X, Search, CreditCard, FileText } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { toast } from 'sonner'
import { useProducts } from '@/hooks/useProducts'
import { useRouter } from 'next/navigation'

type DC = {
  _id: string
  saleId?: {
    _id: string
    customerName?: string
    product?: string
    quantity?: number
  }
  dcOrderId?: {
    _id: string
    school_name?: string
    school_code?: string
    contact_person?: string
    contact_mobile?: string
    email?: string
    products?: any
    status?: string // Status of the DcOrder (e.g., 'saved' for closed leads)
    school_type?: string // 'Existing' for renewal leads, otherwise 'New School'
    createdAt?: string // Date when lead was turned to client
  }
  customerName?: string
  customerPhone?: string
  product?: string
  status?: string
  poPhotoUrl?: string
  createdAt?: string
  productDetails?: any[]
  _isConvertedLead?: boolean // Flag to indicate this is a converted lead (saved DcOrder)
}

export default function ClientDCPage() {
  const router = useRouter()
  const currentUser = getCurrentUser()
  const [items, setItems] = useState<DC[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDC, setSelectedDC] = useState<DC | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingPoUrl, setViewingPoUrl] = useState<string | null>(null)
  const [viewingPoOpen, setViewingPoOpen] = useState(false)
  
  // Client DC Dialog (Full DC Management)
  const [clientDCDialogOpen, setClientDCDialogOpen] = useState(false)
  const [dcProductRows, setDcProductRows] = useState<Array<{
    id: string
    product: string
    class: string
    category: string
    specs: string
    subject?: string
    quantity: number
    strength: number
    level: string
  }>>([])
  const [dcDate, setDcDate] = useState('')
  const [dcRemarks, setDcRemarks] = useState('')
  const [dcCategory, setDcCategory] = useState('')
  const [dcNotes, setDcNotes] = useState('')
  const [dcPoPhotoUrl, setDcPoPhotoUrl] = useState('')
  const [savingClientDC, setSavingClientDC] = useState(false)
  // Invoice view state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState<{
    schoolInfo: any
    paymentBreakdown: any[]
    totalAmount: number
    dcDate?: string
  } | null>(null)
  // Delivery and Address data (read-only)
  const [deliveryAddress, setDeliveryAddress] = useState({
    property_number: '',
    floor: '',
    tower_block: '',
    nearby_landmark: '',
    area: '',
    city: '',
    pincode: '',
  })
  
  // Edit PO Dialog state
  const [editPODialogOpen, setEditPODialogOpen] = useState(false)
  const [selectedDcOrder, setSelectedDcOrder] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    school_name: '',
    contact_person: '',
    contact_mobile: '',
    contact_person2: '',
    contact_mobile2: '',
    email: '',
    address: '',
    school_type: '',
    zone: '',
    location: '',
    products: [] as any[],
    pod_proof_url: '',
    remarks: '',
    total_amount: 0,
    // Delivery and Address fields
    property_number: '',
    floor: '',
    tower_block: '',
    nearby_landmark: '',
    area: '',
    city: '',
    pincode: '',
  })
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editProductRows, setEditProductRows] = useState<Array<{
    id: string
    product_name: string
    quantity: number
    unit_price: number
  }>>([])
  
  const { productNames: availableProducts, getProductLevels, getDefaultLevel, getProductSpecs, getProductSubjects } = useProducts()
  
  // Get available levels for a specific product, default to L1 if product not found
  const getAvailableLevels = (product: string): string[] => {
    return getProductLevels(product)
  }
  const availableClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  const availableCategories = ['New Students', 'Existing Students', 'Both']
  const availableDCCategories = ['Term 1', 'Term 2', 'Term 3', 'Full Year']

  const load = async () => {
    setLoading(true)
    try {
      // Load all DCs (clients) for the employee - including closed leads (saved DcOrders)
      const data = await apiRequest<DC[]>(`/dc/employee/my`)
      console.log('Loaded clients (all):', data)
      
      // Ensure data is an array before filtering
      const dataArray = Array.isArray(data) ? data : []
      
      // Filter: Show ALL closed leads (anything with dcOrderId) and clients with products
      // The backend already filters for this employee's clients, so we show:
      // 1. ALL items with dcOrderId (these are from closed leads) - show them all
      // 2. Clients with products added and submitted (for backward compatibility)
      const filteredClients = dataArray.filter((dc: DC) => {
        // If it has a dcOrderId (either as object or string ID), it's from a closed lead - show it
        const hasDcOrderId = dc.dcOrderId && (typeof dc.dcOrderId === 'object' || typeof dc.dcOrderId === 'string')
        
        if (hasDcOrderId) {
          const schoolName = typeof dc.dcOrderId === 'object' 
            ? dc.dcOrderId?.school_name 
            : dc.customerName
          console.log('Including closed lead:', schoolName || dc.customerName, {
            _isConvertedLead: dc._isConvertedLead,
            dcOrderIdStatus: typeof dc.dcOrderId === 'object' ? dc.dcOrderId?.status : 'unknown',
            dcStatus: dc.status,
            hasDcOrderId: true,
            dcOrderIdType: typeof dc.dcOrderId
          })
          return true
        }
        
        // For DCs without dcOrderId (from Sale), check if client has productDetails with at least one valid product
        // A valid product must have: product name, and either price or strength > 0
        const hasProducts = dc.productDetails && 
                           Array.isArray(dc.productDetails) && 
                           dc.productDetails.length > 0 &&
                           dc.productDetails.some((p: any) => {
                             return p && 
                                    p.product && 
                                    p.product.trim() !== '' && 
                                    (Number(p.price) > 0 || Number(p.strength) > 0)
                           })
        
        // Check if products have been submitted (status indicates submission after adding products)
        // Status 'created' means DC was just created (from closed lead) - show it if it has products
        // Status 'sent_to_manager' means products were added and submitted
        // Status 'po_submitted' means PO was submitted (products should already be added)
        // Other statuses like 'pending_dc', 'warehouse_processing', 'completed' also indicate submission
        const isSubmitted = dc.status === 'created' ||
                           dc.status === 'sent_to_manager' || 
                           dc.status === 'po_submitted' || 
                           dc.status === 'pending_dc' ||
                           dc.status === 'warehouse_processing' ||
                           dc.status === 'completed'
        
        // Show if products exist AND have been submitted (or just created with products)
        if (hasProducts && isSubmitted) {
          console.log('Including client with products:', dc.customerName, { status: dc.status, hasProducts })
        }
        return hasProducts && isSubmitted
      })
      
      console.log('Filtered clients (closed leads + with products):', filteredClients)
      
      // Check for newly converted DC from sessionStorage
      const newlyConvertedDCId = sessionStorage.getItem('newlyConvertedDCId');
      const newlyConvertedDC = sessionStorage.getItem('newlyConvertedDC');
      
      let finalClients = [...filteredClients];
      
      // If there's a newly converted DC that's not in the filtered list, add it
      if (newlyConvertedDCId && newlyConvertedDC) {
        const isAlreadyIncluded = filteredClients.some(dc => dc._id === newlyConvertedDCId);
        if (!isAlreadyIncluded) {
          try {
            const dc = JSON.parse(newlyConvertedDC);
            finalClients = [dc, ...filteredClients];
            console.log('Added newly converted DC from sessionStorage:', dc._id);
          } catch (e) {
            console.warn('Failed to parse newly converted DC from sessionStorage:', e);
          }
        }
        // Clear sessionStorage after using it
        sessionStorage.removeItem('newlyConvertedDCId');
        sessionStorage.removeItem('newlyConvertedDC');
      }
      
      setItems(finalClients)
    } catch (e: any) {
      console.error('Failed to load DCs:', e)
      const errorMessage = e?.message || 'Unknown error'
      // Provide more context for database connection errors
      if (errorMessage.includes('Database connection') || 
          errorMessage.includes('MongoDB') ||
          (errorMessage.includes('connection') && errorMessage.includes('timed out')) ||
          errorMessage.includes('Service Unavailable')) {
        toast.error('Database connection failed. Please check your server connection and try again.')
      } else if (errorMessage.includes('filter is not a function')) {
        toast.error('The API returned invalid data format. Please check the server response.')
      } else {
        toast.error(`Error loading DCs: ${errorMessage}`)
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // FIRST: Check sessionStorage and add the DC immediately (before load() clears items)
    console.log('🔍 Checking sessionStorage for newly converted DC...');
    const newlyConvertedDCId = sessionStorage.getItem('newlyConvertedDCId');
    const newlyConvertedDC = sessionStorage.getItem('newlyConvertedDC');
    
    console.log('📋 SessionStorage check result:', {
      hasId: !!newlyConvertedDCId,
      hasData: !!newlyConvertedDC,
      id: newlyConvertedDCId
    });
    
    if (newlyConvertedDCId && newlyConvertedDC) {
      (async () => {
        try {
          const dc = JSON.parse(newlyConvertedDC);
          console.log('📥 Found newly converted DC in sessionStorage:', {
            id: dc._id,
            hasDcOrderId: !!dc.dcOrderId,
            dcOrderIdType: typeof dc.dcOrderId,
            dcOrderIdValue: dc.dcOrderId
          });
          
          // Try to fetch the full DC from API first (with populated fields)
          // This ensures we have the correct structure even if sessionStorage data is incomplete
          try {
            const fullDC = await apiRequest<DC>(`/dc/${newlyConvertedDCId}`);
            console.log('✅ Fetched full DC from API:', {
              id: fullDC._id,
              hasDcOrderId: !!fullDC.dcOrderId,
              dcOrderIdType: typeof fullDC.dcOrderId,
              customerName: fullDC.customerName || fullDC.dcOrderId?.school_name
            });
            
            // Ensure the DC has the proper structure for the filter
            const dcWithStructure: DC = {
              ...fullDC,
              _isConvertedLead: true,
              // Ensure it has customerName for display
              customerName: fullDC.customerName || fullDC.dcOrderId?.school_name || 'Unknown Client'
            };
            
            // Add it to the list immediately
            setItems(prevItems => {
              const exists = prevItems.some(item => item._id === dcWithStructure._id);
              if (!exists) {
                console.log('➕ Adding newly converted DC to list (from API)');
                return [dcWithStructure, ...prevItems];
              }
              console.log('ℹ️ DC already in list');
              return prevItems;
            });
          } catch (apiErr) {
            // If API fetch fails (timeout), use sessionStorage data as fallback
            console.warn('⚠️ Could not fetch full DC from API, using sessionStorage data:', apiErr);
            
            // Ensure the DC has the proper structure for the filter
            const dcWithStructure: DC = {
              ...dc,
              // Ensure dcOrderId is an object (required by the filter)
              dcOrderId: dc.dcOrderId 
                ? (typeof dc.dcOrderId === 'object' ? dc.dcOrderId : { _id: dc.dcOrderId, school_name: dc.customerName || 'Unknown' })
                : undefined,
              _isConvertedLead: true,
              // Ensure it has customerName for display
              customerName: dc.customerName || dc.dcOrderId?.school_name || 'Unknown Client'
            };
            
            console.log('📦 Prepared DC for display (from sessionStorage):', {
              id: dcWithStructure._id,
              hasDcOrderId: !!dcWithStructure.dcOrderId,
              dcOrderIdType: typeof dcWithStructure.dcOrderId,
              customerName: dcWithStructure.customerName
            });
            
            // Add it to the list immediately (even if query timed out)
            setItems(prevItems => {
              const exists = prevItems.some(item => item._id === dcWithStructure._id);
              if (!exists) {
                console.log('➕ Adding newly converted DC to list (from sessionStorage)');
                return [dcWithStructure, ...prevItems];
              }
              console.log('ℹ️ DC already in list');
              return prevItems;
            });
          }
          
          // Clear sessionStorage AFTER adding to list
          sessionStorage.removeItem('newlyConvertedDCId');
          sessionStorage.removeItem('newlyConvertedDC');
        } catch (err) {
          console.error('Failed to parse newly converted DC:', err);
        }
      })();
    }
    
    // THEN: Load all DCs from API (this will merge with sessionStorage items if they exist)
    load()
  }, [])

  const openInvoiceView = async (dc: DC) => {
    try {
      // Get DC details
      const fullDC = await apiRequest<any>(`/dc/${dc._id}`)
      
      // Get school/client information
      let schoolInfo: any = {}
      let paymentBreakdown: any[] = []
      let totalAmount = 0
      let dcOrder: any = null
      
      if (dc.dcOrderId) {
        const dcOrderId = typeof dc.dcOrderId === 'object' 
          ? dc.dcOrderId._id 
          : dc.dcOrderId
        dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
        
        schoolInfo = {
          customerName: dcOrder.school_name || dc.customerName || '',
          schoolCode: dcOrder.school_code || '',
          contactName: dcOrder.contact_person || '',
          mobileNumber: dcOrder.contact_mobile || dc.customerPhone || '',
          location: dcOrder.location || dcOrder.area || '',
          zone: dcOrder.zone || '',
          email: dcOrder.email || dc.customerEmail || '',
        }
      } else {
        schoolInfo = {
          customerName: dc.customerName || '',
          mobileNumber: dc.customerPhone || '',
        }
      }
      
      // Always recalculate from DcOrder products (most accurate) - don't rely on stored payment breakdown
      // This ensures prices are always correct even if DcOrder was updated after payment creation
      console.log('🔍 Invoice View - DcOrder products:', JSON.stringify(dcOrder?.products, null, 2))
      console.log('🔍 Invoice View - DC productDetails:', JSON.stringify(fullDC.productDetails, null, 2))
      
      if (fullDC.productDetails && Array.isArray(fullDC.productDetails) && fullDC.productDetails.length > 0) {
        if (dcOrder && dcOrder.products && Array.isArray(dcOrder.products) && dcOrder.products.length > 0) {
          console.log('🔍 Matching - DcOrder has', dcOrder.products.length, 'products, DC has', fullDC.productDetails.length, 'productDetails')
          // Match DC productDetails with DcOrder products by INDEX/POSITION first (most accurate)
          // This ensures each row gets its corresponding price from Edit PO
          const usedIndices = new Set<number>()
          
          paymentBreakdown = fullDC.productDetails.map((pd: any, index: number) => {
            // First try to match by index/position (most accurate)
            let matchingProduct: any = null
            let matchingIndex = -1
            
            // Try exact index match first
            if (index < dcOrder.products.length && !usedIndices.has(index)) {
              matchingProduct = dcOrder.products[index]
              matchingIndex = index
              usedIndices.add(index)
              console.log(`Invoice Product[${index}]: Matched by exact index -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
            } else {
              // If exact index is used or out of bounds, find unused product with matching name
              const dcProductName = (pd.product || '').toLowerCase().trim()
              
              // First try to find unused product with exact name match
              for (let i = 0; i < dcOrder.products.length; i++) {
                if (usedIndices.has(i)) continue
                
                const p = dcOrder.products[i]
                const orderProductName = (p.product_name || '').toLowerCase().trim()
                
                if (dcProductName === orderProductName) {
                  matchingProduct = p
                  matchingIndex = i
                  usedIndices.add(i)
                  console.log(`Invoice Product[${index}]: Matched by name (exact) at index ${i} -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                  break
                }
              }
              
              // If still no match, try partial name match
              if (!matchingProduct) {
                for (let i = 0; i < dcOrder.products.length; i++) {
                  if (usedIndices.has(i)) continue
                  
                  const p = dcOrder.products[i]
                  const orderProductName = (p.product_name || '').toLowerCase().trim()
                  
                  if (dcProductName.includes(orderProductName) || orderProductName.includes(dcProductName)) {
                    matchingProduct = p
                    matchingIndex = i
                    usedIndices.add(i)
                    console.log(`Invoice Product[${index}]: Matched by name (partial) at index ${i} -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                    break
                  }
                }
              }
              
              // Last resort: use any matching product name (even if already used)
              if (!matchingProduct) {
                const dcProductName = (pd.product || '').toLowerCase().trim()
                matchingProduct = dcOrder.products.find((p: any) => {
                  const orderProductName = (p.product_name || '').toLowerCase().trim()
                  return dcProductName === orderProductName || 
                         dcProductName.includes(orderProductName) || 
                         orderProductName.includes(dcProductName)
                })
                if (matchingProduct) {
                  console.log(`Invoice Product[${index}]: Matched by name (fallback, may be duplicate) -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                }
              }
            }
            
            // Get unit price from DcOrder product, or from DC productDetails if available
            const unitPrice = matchingProduct 
              ? (Number(matchingProduct.unit_price) || 0)
              : (Number(pd.price) || 0)
            
            const quantity = Number(pd.quantity) || 0
            const strength = Number(pd.strength) || 0
            // Use strength for calculation (not quantity) - strength is the actual number of students/items
            const total = unitPrice * strength
            totalAmount += total
            
            console.log(`Invoice Product[${index}]: ${pd.product}, UnitPrice: ₹${unitPrice}, Strength: ${strength}, Total: ₹${total}, MatchedIndex: ${matchingIndex}`)
            
            return {
              product: pd.product || '',
              class: pd.class || '1',
              category: pd.category || 'New School',
              specs: pd.specs || 'Regular',
              subject: pd.subject || undefined,
              quantity: quantity,
              strength: strength,
              level: pd.level || 'L2',
              unitPrice: unitPrice,
              total: total,
            }
          })
        } else {
          // Fallback: use DC productDetails with prices if available
          paymentBreakdown = fullDC.productDetails.map((p: any) => {
            const price = Number(p.price) || 0
            const quantity = Number(p.quantity) || 0
            const strength = Number(p.strength) || 0
            // Use strength for calculation (not quantity) - strength is the actual number of students/items
            const total = Number(p.total) || (price * strength)
            totalAmount += total
            return {
              product: p.product || '',
              class: p.class || '1',
              category: p.category || 'New School',
              specs: p.specs || 'Regular',
              subject: p.subject || undefined,
              quantity: quantity,
              strength: strength,
              level: p.level || 'L2',
              unitPrice: price,
              total: total,
            }
          })
        }
      }
      
      // If still no breakdown but we have total_amount from DcOrder, estimate
      if (paymentBreakdown.length === 0 && dcOrder && dcOrder.total_amount && Number(dcOrder.total_amount) > 0) {
        totalAmount = Number(dcOrder.total_amount)
        // Try to get from DC productDetails and estimate prices
        if (fullDC.productDetails && Array.isArray(fullDC.productDetails) && fullDC.productDetails.length > 0) {
          // Use strength for calculation (not quantity)
          const totalStrength = fullDC.productDetails.reduce((sum: number, p: any) => 
            sum + (Number(p.strength) || 0), 0
          )
          const estimatedUnitPrice = totalStrength > 0 ? totalAmount / totalStrength : 0
          
          paymentBreakdown = fullDC.productDetails.map((pd: any) => {
            const quantity = Number(pd.quantity) || 0
            const strength = Number(pd.strength) || 0
            const total = estimatedUnitPrice * strength
            return {
              product: pd.product || '',
              class: pd.class || '1',
              category: pd.category || 'New School',
              specs: pd.specs || 'Regular',
              subject: pd.subject || undefined,
              quantity: quantity,
              strength: Number(pd.strength) || 0,
              level: pd.level || 'L2',
              unitPrice: estimatedUnitPrice,
              total: total,
            }
          })
        }
      }
      
      setInvoiceData({
        schoolInfo,
        paymentBreakdown,
        totalAmount,
        dcDate: fullDC.dcDate || undefined,
      })
      setInvoiceModalOpen(true)
    } catch (e: any) {
      console.error('Failed to load invoice:', e)
      toast.error('Failed to load invoice data: ' + (e?.message || 'Unknown error'))
    }
  }

  const openClientDCDialog = async (dc: DC) => {
    setSelectedDC(dc)
    
    // Determine category automatically based on school_type from dcOrderId
    // If school_type is 'Existing', it's a renewal/existing school, otherwise it's a new school
    const autoCategory = dc.dcOrderId && typeof dc.dcOrderId === 'object' && dc.dcOrderId.school_type === 'Existing'
      ? 'Existing School'
      : 'New School'
    
    // Load delivery address data from dcOrderId
    let deliveryData = {
      property_number: '',
      floor: '',
      tower_block: '',
      nearby_landmark: '',
      area: '',
      city: '',
      pincode: '',
    }
    
    // Get dcOrderId to fetch delivery address
    const dcOrderId = typeof dc.dcOrderId === 'object' ? dc.dcOrderId._id : dc.dcOrderId
    if (dcOrderId) {
      try {
        const dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
        // Load delivery address - prioritize pendingEdit (if exists), then approved fields
        // This ensures we show the delivery address that was filled in Edit PO
        if (dcOrder.pendingEdit && dcOrder.pendingEdit.status === 'pending') {
          // Show from pendingEdit if there's a pending edit request
          deliveryData = {
            property_number: dcOrder.pendingEdit.property_number || '',
            floor: dcOrder.pendingEdit.floor || '',
            tower_block: dcOrder.pendingEdit.tower_block || '',
            nearby_landmark: dcOrder.pendingEdit.nearby_landmark || '',
            area: dcOrder.pendingEdit.area || '',
            city: dcOrder.pendingEdit.city || '',
            pincode: dcOrder.pendingEdit.pincode || '',
          }
        } else {
          // If no pending edit, show from approved/main fields (delivery address saved after approval)
          deliveryData = {
            property_number: dcOrder.property_number || '',
            floor: dcOrder.floor || '',
            tower_block: dcOrder.tower_block || '',
            nearby_landmark: dcOrder.nearby_landmark || '',
            area: dcOrder.area || '',
            city: dcOrder.city || '',
            pincode: dcOrder.pincode || '',
          }
        }
      } catch (e) {
        console.error('Failed to load delivery address:', e)
      }
    }
    setDeliveryAddress(deliveryData)
    
    // Load full DC details
    try {
      const fullDC = await apiRequest<any>(`/dc/${dc._id}`)
      
      // Load existing product details - only show products that were added via "Add Products"
      if (fullDC.productDetails && Array.isArray(fullDC.productDetails) && fullDC.productDetails.length > 0) {
        // Only show products that were actually added (have product name and details)
        const addedProducts = fullDC.productDetails.filter((p: any) => p.product && (p.price > 0 || p.strength > 0))
        if (addedProducts.length > 0) {
          console.log('Loading products for Client DC:', JSON.stringify(addedProducts, null, 2))
          setDcProductRows(addedProducts.map((p: any, idx: number) => {
            // Read values directly - preserve 0 values, only default if null/undefined
            const strengthNum = p.strength !== null && p.strength !== undefined ? Number(p.strength) : 0
            const quantityNum = p.quantity !== null && p.quantity !== undefined ? Number(p.quantity) : strengthNum
            
            const row = {
              id: String(idx + 1),
              product: p.product || '',
              class: p.class || '1',
              category: autoCategory, // Use auto-determined category
              specs: p.specs || 'Regular', // Preserve specs from saved data
              subject: (p.subject && p.subject.trim() !== '') ? p.subject : undefined, // Preserve subject from saved data, handle empty string
              quantity: quantityNum,
              strength: strengthNum,
              level: p.level || getDefaultLevel(p.product || 'Abacus'),
            }
            console.log(`Client DC Product ${idx + 1} - Specs/Subject:`, {
              raw: { specs: p.specs, subject: p.subject, product: p.product },
              loaded: { specs: row.specs, subject: row.subject },
              fullProduct: p
            })
            return row
          }))
        } else {
          // No products added yet - show empty state
          setDcProductRows([])
        }
      } else {
        // No productDetails at all - show empty state
        setDcProductRows([])
      }
      
      // Load DC details
      setDcDate(fullDC.dcDate ? new Date(fullDC.dcDate).toISOString().split('T')[0] : '')
      setDcRemarks(fullDC.dcRemarks || '')
      setDcCategory(fullDC.dcCategory || '')
      setDcNotes(fullDC.dcNotes || '')
      setDcPoPhotoUrl(fullDC.poPhotoUrl || '')
    } catch (e) {
      console.error('Failed to load DC details:', e)
      // Initialize with empty state - no products until added via "Add Products"
      setDcProductRows([])
      setDcDate('')
      setDcRemarks('')
      setDcCategory('')
      setDcNotes('')
      setDcPoPhotoUrl(dc.poPhotoUrl || '')
    }
    
    setClientDCDialogOpen(true)
  }

  const saveClientRequest = async () => {
    // Save without submitting
    if (!selectedDC) return

    setSavingClientDC(true)
    try {
      // Prepare product details
      const productDetails = dcProductRows.length > 0 
        ? dcProductRows.map(row => ({
            product: row.product || '',
            class: row.class || '1',
            category: row.category || 'New School',
            specs: row.specs || 'Regular',
            subject: row.subject || undefined,
            quantity: Number(row.quantity) || 0,
            strength: Number(row.strength) || 0,
            level: row.level || getDefaultLevel(row.product || 'Abacus'),
          }))
        : undefined

      const totalQuantity = dcProductRows.length > 0 
        ? dcProductRows.reduce((sum, p) => sum + (p.quantity || 0), 0)
        : undefined

      // Update DC without changing status
      const updatePayload: any = {}

      if (productDetails !== undefined) {
        updatePayload.productDetails = productDetails
      }
      if (totalQuantity !== undefined) {
        updatePayload.requestedQuantity = totalQuantity
      }

      // Update PO photo if provided
      if (dcPoPhotoUrl) {
        updatePayload.poPhotoUrl = dcPoPhotoUrl
        updatePayload.poDocument = dcPoPhotoUrl
      }

      await apiRequest(`/dc/${selectedDC._id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      })

      toast.success('Client Request saved successfully!')
      setClientDCDialogOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save Client Request')
    } finally {
      setSavingClientDC(false)
    }
  }

  const requestClientDC = async () => {
    if (!selectedDC) return

    // Validate products - must have at least one product
    if (dcProductRows.length === 0) {
      toast.error('Please add at least one product before requesting')
      return
    }

    const invalidProducts = dcProductRows.filter(p => !p.product || !p.quantity || !p.strength)
    if (invalidProducts.length > 0) {
      toast.error('Please fill in Product, Quantity, and Strength for all products')
      return
    }

    setSavingClientDC(true)
    try {
      // Prepare product details
      const productDetails = dcProductRows.map(row => ({
        product: row.product || '',
        class: row.class || '1',
        category: row.category || 'New School',
        specs: row.specs || 'Regular',
        subject: row.subject || undefined,
        quantity: Number(row.quantity) || 0,
        strength: Number(row.strength) || 0,
        level: row.level || getDefaultLevel(row.product || 'Abacus'),
      }))

      const totalQuantity = dcProductRows.reduce((sum, p) => sum + (p.quantity || 0), 0)

      // Update DC and set status to 'pending_dc' when request is submitted
      const updatePayload: any = {
        productDetails: productDetails,
        requestedQuantity: totalQuantity,
        status: 'pending_dc', // Set status to pending_dc when request is submitted
      }

      // Update PO photo if provided
      if (dcPoPhotoUrl) {
        updatePayload.poPhotoUrl = dcPoPhotoUrl
        updatePayload.poDocument = dcPoPhotoUrl
      }

      const updatedDC = await apiRequest(`/dc/${selectedDC._id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      })

      // Calculate total amount from productDetails - ALWAYS get prices from DcOrder products
      let totalAmount = 0
      let paymentBreakdown: any[] = []
      
      // Always try to get prices from DcOrder products first (most accurate)
      if (selectedDC.dcOrderId) {
        try {
          const dcOrderId = typeof selectedDC.dcOrderId === 'object' 
            ? selectedDC.dcOrderId._id 
            : selectedDC.dcOrderId
          const dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
          
          console.log('📦 DcOrder products:', JSON.stringify(dcOrder.products, null, 2))
          console.log('📦 DC productDetails:', JSON.stringify(productDetails, null, 2))
          console.log('📦 Matching products - DcOrder has', dcOrder.products.length, 'products, DC has', productDetails.length, 'productDetails')
          
          if (dcOrder.products && Array.isArray(dcOrder.products) && dcOrder.products.length > 0) {
            // Match products by INDEX/POSITION first (most accurate - each row matches to corresponding DcOrder product)
            // This ensures that if you have 5 rows of "Abacus" with different prices in Edit PO,
            // each row gets its own correct price
            const usedIndices = new Set<number>()
            
            paymentBreakdown = productDetails.map((pd: any, index: number) => {
              // First try to match by index/position (most accurate)
              let matchingProduct: any = null
              let matchingIndex = -1
              
              // Try exact index match first
              if (index < dcOrder.products.length && !usedIndices.has(index)) {
                matchingProduct = dcOrder.products[index]
                matchingIndex = index
                usedIndices.add(index)
                console.log(`Payment Creation Product[${index}]: Matched by exact index -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
              } else {
                // If exact index is used or out of bounds, find unused product with matching name
                const dcProductName = (pd.product || '').toLowerCase().trim()
                
                // First try to find unused product with exact name match
                for (let i = 0; i < dcOrder.products.length; i++) {
                  if (usedIndices.has(i)) continue
                  
                  const p = dcOrder.products[i]
                  const orderProductName = (p.product_name || '').toLowerCase().trim()
                  
                  if (dcProductName === orderProductName) {
                    matchingProduct = p
                    matchingIndex = i
                    usedIndices.add(i)
                    console.log(`Payment Creation Product[${index}]: Matched by name (exact) at index ${i} -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                    break
                  }
                }
                
                // If still no match, try partial name match
                if (!matchingProduct) {
                  for (let i = 0; i < dcOrder.products.length; i++) {
                    if (usedIndices.has(i)) continue
                    
                    const p = dcOrder.products[i]
                    const orderProductName = (p.product_name || '').toLowerCase().trim()
                    
                    if (dcProductName.includes(orderProductName) || orderProductName.includes(dcProductName)) {
                      matchingProduct = p
                      matchingIndex = i
                      usedIndices.add(i)
                      console.log(`Payment Creation Product[${index}]: Matched by name (partial) at index ${i} -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                      break
                    }
                  }
                }
                
                // Last resort: use any matching product name (even if already used)
                if (!matchingProduct) {
                  const dcProductName = (pd.product || '').toLowerCase().trim()
                  matchingProduct = dcOrder.products.find((p: any) => {
                    const orderProductName = (p.product_name || '').toLowerCase().trim()
                    return dcProductName === orderProductName || 
                           dcProductName.includes(orderProductName) || 
                           orderProductName.includes(dcProductName)
                  })
                  if (matchingProduct) {
                    console.log(`Payment Creation Product[${index}]: Matched by name (fallback, may be duplicate) -> ${matchingProduct?.product_name} (₹${matchingProduct?.unit_price})`)
                  }
                }
              }
              
              const unitPrice = matchingProduct ? (Number(matchingProduct.unit_price) || 0) : 0
              const quantity = Number(pd.quantity) || 0
              const strength = Number(pd.strength) || 0
              // Use strength for calculation (not quantity) - strength is the actual number of students/items
              const total = unitPrice * strength
              totalAmount += total
              
              console.log(`Payment Creation Product[${index}]: ${pd.product}, UnitPrice: ₹${unitPrice}, Quantity: ${quantity}, Strength: ${strength}, Total: ₹${total}, MatchedIndex: ${matchingIndex}`)
              
              return {
                product: pd.product || '',
                class: pd.class || '1',
                category: pd.category || 'New School',
                specs: pd.specs || 'Regular',
                subject: pd.subject || undefined,
                quantity: quantity,
                strength: strength,
                level: pd.level || 'L2',
                unitPrice: unitPrice,
                total: total,
              }
            })
            
            console.log('💰 Calculated totalAmount from DcOrder products:', totalAmount)
            console.log('💰 Payment breakdown:', paymentBreakdown)
          }
        } catch (e) {
          console.error('Failed to get prices from DcOrder:', e)
        }
      }
      
      // Fallback: If no prices from DcOrder, try to get from DC productDetails
      if (totalAmount === 0 && updatedDC.productDetails && Array.isArray(updatedDC.productDetails)) {
        paymentBreakdown = updatedDC.productDetails.map((p: any) => {
          const price = Number(p.price) || 0
          const quantity = Number(p.quantity) || 0
          const strength = Number(p.strength) || 0
          // Use strength for calculation (not quantity) - strength is the actual number of students/items
          const total = Number(p.total) || (price * strength)
          totalAmount += total
          return {
            product: p.product || '',
            class: p.class || '1',
            category: p.category || 'New School',
            specs: p.specs || 'Regular',
            subject: p.subject || undefined,
            quantity: quantity,
            strength: strength,
            level: p.level || 'L2',
            unitPrice: price,
            total: total,
          }
        })
      }
      
      // If still no total, calculate from productDetails with default or use total_amount from DcOrder
      if (totalAmount === 0 && selectedDC.dcOrderId) {
        try {
          const dcOrderId = typeof selectedDC.dcOrderId === 'object' 
            ? selectedDC.dcOrderId._id 
            : selectedDC.dcOrderId
          const dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
          
          if (dcOrder.total_amount && Number(dcOrder.total_amount) > 0) {
            totalAmount = Number(dcOrder.total_amount)
            // Create breakdown with estimated prices
            paymentBreakdown = productDetails.map((pd: any) => {
            const quantity = Number(pd.quantity) || 0
            const strength = Number(pd.strength) || 0
            // Use strength for calculation (not quantity)
            const totalStrength = productDetails.reduce((sum: number, p: any) => 
              sum + (Number(p.strength) || 0), 0
            )
            const estimatedUnitPrice = totalStrength > 0 ? totalAmount / totalStrength : 0
            const total = estimatedUnitPrice * strength
              return {
                product: pd.product || '',
                class: pd.class || '1',
                category: pd.category || 'New School',
                specs: pd.specs || 'Regular',
                subject: pd.subject || undefined,
                quantity: quantity,
                strength: strength,
                level: pd.level || 'L2',
                unitPrice: estimatedUnitPrice,
                total: total,
              }
            })
          }
        } catch (e) {
          console.error('Failed to get total_amount from DcOrder:', e)
        }
      }

      // Get school/client information for payment
      let schoolInfo: any = {}
      if (selectedDC.dcOrderId) {
        try {
          const dcOrderId = typeof selectedDC.dcOrderId === 'object' 
            ? selectedDC.dcOrderId._id 
            : selectedDC.dcOrderId
          const dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
          schoolInfo = {
            customerName: dcOrder.school_name || selectedDC.customerName || '',
            schoolCode: dcOrder.school_code || '',
            contactName: dcOrder.contact_person || '',
            mobileNumber: dcOrder.contact_mobile || selectedDC.customerPhone || '',
            location: dcOrder.location || dcOrder.area || '',
            zone: dcOrder.zone || '',
            email: dcOrder.email || selectedDC.customerEmail || '',
          }
        } catch (e) {
          console.error('Failed to get school info:', e)
          schoolInfo = {
            customerName: selectedDC.customerName || '',
            mobileNumber: selectedDC.customerPhone || '',
          }
        }
      } else {
        schoolInfo = {
          customerName: selectedDC.customerName || '',
          mobileNumber: selectedDC.customerPhone || '',
        }
      }

      // Create payment automatically when DC is requested
      if (totalAmount > 0) {
        try {
          const currentUser = getCurrentUser()
          const paymentPayload = {
            dcId: selectedDC._id,
            customerName: schoolInfo.customerName,
            schoolCode: schoolInfo.schoolCode,
            contactName: schoolInfo.contactName,
            mobileNumber: schoolInfo.mobileNumber,
            location: schoolInfo.location,
            zone: schoolInfo.zone,
            amount: totalAmount,
            paymentMethod: 'Other', // Will be updated when payment is received (Cash, UPI, etc.)
            paymentDate: new Date().toISOString(),
            status: 'Pending',
            description: `Auto-generated payment for DC request - ${schoolInfo.customerName}`,
            paymentBreakdown: paymentBreakdown,
            autoCreated: true,
            createdBy: currentUser?._id,
          }

          await apiRequest('/payments/create', {
            method: 'POST',
            body: JSON.stringify(paymentPayload),
          })

          console.log('✅ Payment created automatically for DC request:', {
            dcId: selectedDC._id,
            amount: totalAmount,
            customerName: schoolInfo.customerName,
          })
        } catch (paymentErr: any) {
          console.error('❌ Failed to create payment automatically:', paymentErr)
          // Don't fail the whole operation if payment creation fails
          toast.warning('DC requested successfully, but failed to create payment automatically. Please create payment manually.')
        }
      } else {
        console.warn('⚠️ Total amount is 0, skipping payment creation')
        toast.warning('DC requested successfully, but no payment was created as total amount is 0.')
      }

      // Update the related DcOrder status to 'dc_requested' and store request data
      // This makes it appear in Closed Sales for Admin/Coordinator to review
      if (selectedDC.dcOrderId) {
        try {
          const dcOrderId = typeof selectedDC.dcOrderId === 'object' 
            ? selectedDC.dcOrderId._id 
            : selectedDC.dcOrderId
          
          const currentUser = getCurrentUser()
          
          console.log('🔄 Updating DcOrder status to dc_requested with request data:', dcOrderId)
          
          // Store the request data in DcOrder so Admin/Coordinator can see it in Closed Sales
          const updateResult = await apiRequest(`/dc-orders/${dcOrderId}`, {
            method: 'PUT',
            body: JSON.stringify({ 
              status: 'dc_requested',
              dcRequestData: {
                // Store product details from the request
                productDetails: productDetails,
                requestedQuantity: totalQuantity,
                // Store employee ID who made the request
                employeeId: currentUser?._id || selectedDC.employeeId,
                // Store any PO photo URL if provided
                poPhotoUrl: dcPoPhotoUrl || undefined,
                // Store timestamp
                requestedAt: new Date().toISOString(),
              }
            }),
          })
          
          console.log('✅ Updated DcOrder status to dc_requested:', {
            dcOrderId,
            newStatus: updateResult?.status,
            schoolName: updateResult?.school_name
          })
        } catch (dcOrderErr: any) {
          console.error('❌ Failed to update DcOrder status:', {
            error: dcOrderErr?.message,
            dcOrderId: typeof selectedDC.dcOrderId === 'object' 
              ? selectedDC.dcOrderId._id 
              : selectedDC.dcOrderId
          })
          // Continue even if DcOrder update fails, but show warning
          toast.warning('DC updated but failed to update DcOrder status. Please check Closed Sales manually.')
        }
      } else {
        console.warn('⚠️ No dcOrderId found on DC, cannot update DcOrder status')
      }

      // If PO photo is provided and status is created, also submit PO
      if (dcPoPhotoUrl && selectedDC.status === 'created') {
        try {
          await apiRequest(`/dc/${selectedDC._id}/submit-po`, {
            method: 'POST',
            body: JSON.stringify({ 
              poPhotoUrl: dcPoPhotoUrl,
              remarks: 'PO submitted via Client Request'
            }),
          })
        } catch (poErr) {
          console.error('PO submission failed:', poErr)
          // Continue even if PO submission fails
        }
      }

      // Store invoice data for viewing
      setInvoiceData({
        schoolInfo,
        paymentBreakdown,
        totalAmount,
        dcDate: dcDate || undefined,
      })
      
      // Store invoice data for viewing
      setInvoiceData({
        schoolInfo,
        paymentBreakdown,
        totalAmount,
        dcDate: dcDate || undefined,
      })
      
      toast.success('Client Request submitted successfully! It will appear in Closed Sales for Admin/Coordinator to review and raise DC.')
      setClientDCDialogOpen(false)
      // Open invoice modal after a short delay
      setTimeout(() => {
        setInvoiceModalOpen(true)
      }, 500)
      load()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit Client Request')
    } finally {
      setSavingClientDC(false)
    }
  }

  const openEditPODialog = async (dc: DC) => {
    // Get the DcOrder ID from the DC
    const dcOrderId = typeof dc.dcOrderId === 'object' ? dc.dcOrderId._id : dc.dcOrderId
    
    if (!dcOrderId) {
      toast.error('Cannot edit: DC Order not found')
      return
    }

    try {
      // Fetch the full DcOrder details
      const dcOrder = await apiRequest<any>(`/dc-orders/${dcOrderId}`)
      setSelectedDcOrder(dcOrder)
      
      // Populate form with current data
      const formData = {
        school_name: dcOrder.school_name || '',
        contact_person: dcOrder.contact_person || '',
        contact_mobile: dcOrder.contact_mobile || '',
        contact_person2: dcOrder.contact_person2 || '',
        contact_mobile2: dcOrder.contact_mobile2 || '',
        email: dcOrder.email || '',
        address: dcOrder.address || '',
        school_type: dcOrder.school_type || '',
        zone: dcOrder.zone || '',
        location: dcOrder.location || '',
        products: dcOrder.products || [],
        pod_proof_url: dcOrder.pod_proof_url || dc.poPhotoUrl || '',
        remarks: dcOrder.remarks || '',
        total_amount: dcOrder.total_amount || 0,
        // Delivery and Address fields - only from pendingEdit (not from school address)
        property_number: dcOrder.pendingEdit?.property_number || '',
        floor: dcOrder.pendingEdit?.floor || '',
        tower_block: dcOrder.pendingEdit?.tower_block || '',
        nearby_landmark: dcOrder.pendingEdit?.nearby_landmark || '',
        area: dcOrder.pendingEdit?.area || '',
        city: dcOrder.pendingEdit?.city || '',
        pincode: dcOrder.pendingEdit?.pincode || '',
      }
      
      console.log('📋 Edit PO Dialog opened - Form data initialized:', {
        property_number: formData.property_number,
        floor: formData.floor,
        tower_block: formData.tower_block,
        nearby_landmark: formData.nearby_landmark,
        area: formData.area,
        city: formData.city,
        pincode: formData.pincode,
        hasPendingEdit: !!dcOrder.pendingEdit,
      })
      
      setEditFormData(formData)
      
      // Set product rows
      setEditProductRows(
        (dcOrder.products || []).map((p: any, idx: number) => ({
          id: String(idx + 1),
          product_name: p.product_name || '',
          quantity: p.quantity || 0,
          unit_price: p.unit_price || 0,
        }))
      )
      
      setEditPODialogOpen(true)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load DC Order details')
    }
  }

  const savePOChanges = async () => {
    console.log('🚀 savePOChanges called')
    if (!selectedDcOrder) {
      console.error('❌ No selectedDcOrder, cannot save')
      return
    }

    console.log('✅ selectedDcOrder exists:', selectedDcOrder._id)
    setSubmittingEdit(true)
    try {
      // Log current editFormData state before preparing payload
      console.log('📝 Current editFormData state:', {
        property_number: editFormData.property_number,
        floor: editFormData.floor,
        tower_block: editFormData.tower_block,
        nearby_landmark: editFormData.nearby_landmark,
        area: editFormData.area,
        city: editFormData.city,
        pincode: editFormData.pincode,
      })

      // Prepare products array
      const products = editProductRows.map(row => ({
        product_name: row.product_name,
        quantity: row.quantity,
        unit_price: row.unit_price,
      }))

      // Calculate total amount
      const totalAmount = products.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0)

      // Prepare the payload with all fields including delivery address
      // Explicitly include delivery address fields to ensure they're sent
      // Get delivery address fields from editFormData, with fallback to empty string
      const deliveryAddressFields = {
        property_number: (editFormData.property_number !== undefined && editFormData.property_number !== null) ? String(editFormData.property_number) : '',
        floor: (editFormData.floor !== undefined && editFormData.floor !== null) ? String(editFormData.floor) : '',
        tower_block: (editFormData.tower_block !== undefined && editFormData.tower_block !== null) ? String(editFormData.tower_block) : '',
        nearby_landmark: (editFormData.nearby_landmark !== undefined && editFormData.nearby_landmark !== null) ? String(editFormData.nearby_landmark) : '',
        area: (editFormData.area !== undefined && editFormData.area !== null) ? String(editFormData.area) : '',
        city: (editFormData.city !== undefined && editFormData.city !== null) ? String(editFormData.city) : '',
        pincode: (editFormData.pincode !== undefined && editFormData.pincode !== null) ? String(editFormData.pincode) : '',
      }

      const payload = {
        ...editFormData,
        products,
        total_amount: totalAmount,
        // Explicitly include delivery address fields (overrides any from spread)
        ...deliveryAddressFields,
      }

      // Log the full payload to verify delivery address fields are included
      console.log('Saving PO changes - Full payload:', JSON.stringify(payload, null, 2))
      console.log('Delivery address fields in payload:', {
        property_number: payload.property_number,
        floor: payload.floor,
        tower_block: payload.tower_block,
        nearby_landmark: payload.nearby_landmark,
        area: payload.area,
        city: payload.city,
        pincode: payload.pincode,
      })

      // Update directly (no approval needed)
      console.log('📤 Updating DC Order directly:', `/dc-orders/${selectedDcOrder._id}`)
      const response = await apiRequest(`/dc-orders/${selectedDcOrder._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      console.log('✅ DC Order updated successfully:', response)

      toast.success('PO updated successfully!')
      setEditPODialogOpen(false)
      load()
    } catch (e: any) {
      console.error('❌❌❌ ERROR UPDATING PO ❌❌❌')
      console.error('Error object:', e)
      console.error('Error message:', e?.message)
      console.error('Error status:', e?.status)
      console.error('Error response:', e?.response)
      
      toast.error(e?.message || 'Failed to update PO')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Filter and sort items based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let filtered = items
    
    if (query) {
      filtered = items.filter((d) => {
        const customerName = (d.customerName || d.saleId?.customerName || d.dcOrderId?.school_name || '').toLowerCase()
        const phone = (d.customerPhone || d.dcOrderId?.contact_mobile || '').toLowerCase()
        const product = (d.product || d.saleId?.product || (d.dcOrderId?.products && Array.isArray(d.dcOrderId.products) ? d.dcOrderId.products.map((p: any) => p.product_name || p.product).join(', ') : '')).toLowerCase()
        const status = (d.status || 'created').toLowerCase()
        
        return customerName.includes(query) || 
               phone.includes(query) || 
               product.includes(query) || 
               status.includes(query)
      })
    }
    
    // Sort by most recent turned date first
    return filtered.sort((a, b) => {
      // Get turned date: use dcOrderId.createdAt for converted leads, otherwise use createdAt
      const dateA = (typeof a.dcOrderId === 'object' && a.dcOrderId?.createdAt) 
        ? new Date(a.dcOrderId.createdAt).getTime()
        : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      
      const dateB = (typeof b.dcOrderId === 'object' && b.dcOrderId?.createdAt)
        ? new Date(b.dcOrderId.createdAt).getTime()
        : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
      
      // Most recent first (descending order)
      return dateB - dateA
    })
  }, [items, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900">Client Request</h1>
          <p className="text-sm text-neutral-600 mt-1">Manage products, PO photos, and request details for your clients</p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <Card className="p-4">
        {/* Search Section */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by client name, phone, product, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading && <div className="p-4 text-center">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-neutral-600">No clients found with products added.</p>
            <p className="text-sm text-neutral-500 mt-2">
              Closed leads and clients with products added and submitted will appear here.
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              Closed leads appear here automatically. You can add products and manage client details directly from this page.
            </p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>School Code</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Client Turned Date</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-neutral-500 py-4">
                      No clients found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((d, idx) => {
                    const customerName = d.customerName || d.saleId?.customerName || d.dcOrderId?.school_name || 'Unknown Client'
                    const phone = d.customerPhone || d.dcOrderId?.contact_mobile || '-'
                    const product = d.product || d.saleId?.product || (d.dcOrderId?.products && Array.isArray(d.dcOrderId.products) ? d.dcOrderId.products.map((p: any) => p.product_name || p.product).join(', ') : '-')
                    const status = d.status || 'created'
                    const createdDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'
                    // Client turned date: use dcOrderId.createdAt for converted leads, otherwise use createdAt
                    const turnedDate = (typeof d.dcOrderId === 'object' && d.dcOrderId?.createdAt)
                      ? new Date(d.dcOrderId.createdAt).toLocaleDateString()
                      : (d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-')
                    // Get school code from dcOrderId
                    const schoolCode = (typeof d.dcOrderId === 'object' && d.dcOrderId?.school_code) 
                      ? d.dcOrderId.school_code 
                      : '-'
                    
                    return (
                      <TableRow key={d._id} className="hover:bg-neutral-50">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium text-blue-700">{schoolCode}</TableCell>
                        <TableCell className="font-medium">{customerName}</TableCell>
                        <TableCell>{phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={product}>{product}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                            status === 'created' ? 'bg-blue-100 text-blue-700' :
                            status === 'po_submitted' ? 'bg-yellow-100 text-yellow-700' :
                            status === 'sent_to_manager' ? 'bg-purple-100 text-purple-700' :
                            status === 'warehouse_processing' ? 'bg-orange-100 text-orange-700' :
                            status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {status}
                          </span>
                        </TableCell>
                        <TableCell>{createdDate}</TableCell>
                        <TableCell>{turnedDate}</TableCell>
                        <TableCell>
                          {d.poPhotoUrl ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                              onClick={() => {
                                setViewingPoUrl(d.poPhotoUrl || null)
                                setViewingPoOpen(true)
                              }}
                            >
                              View PO
                            </Button>
                          ) : (
                            <span className="text-sm text-neutral-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {status === 'pending_dc' || status === 'warehouse_processing' || status === 'completed' ? (
                            <div className="flex items-center gap-2 justify-center">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openInvoiceView(d)}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                View Invoice
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 justify-center">
                              {d.poPhotoUrl && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openEditPODialog(d)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit PO
                                </Button>
                              )}
                              {/* Always show Edit PO button if dcOrderId exists, even without PO photo */}
                              {!d.poPhotoUrl && d.dcOrderId && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openEditPODialog(d)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit PO
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                onClick={() => openClientDCDialog(d)}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Request DC
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* PO View Modal */}
      <Dialog open={viewingPoOpen} onOpenChange={setViewingPoOpen}>
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order (PO)</DialogTitle>
            <DialogDescription>
              View the purchase order document
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {viewingPoUrl && (
              <div className="relative">
                {viewingPoUrl.toLowerCase().endsWith('.pdf') || 
                 viewingPoUrl.includes('application/pdf') || 
                 viewingPoUrl.includes('.pdf') ||
                 (viewingPoUrl.startsWith('data:') && viewingPoUrl.includes('application/pdf')) ||
                 (viewingPoUrl.startsWith('http') && viewingPoUrl.toLowerCase().includes('.pdf')) ? (
                  <div className="border rounded-lg p-4 bg-neutral-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">PO Document (PDF)</span>
                      <a 
                        href={viewingPoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm underline"
                      >
                        Open PDF in New Tab
                      </a>
                    </div>
                    {viewingPoUrl.startsWith('data:') ? (
                      <iframe 
                        src={viewingPoUrl} 
                        className="w-full h-[70vh] rounded border"
                        title="PO Document"
                      />
                    ) : (
                      <iframe 
                        src={`${viewingPoUrl}#toolbar=0`} 
                        className="w-full h-[70vh] rounded border"
                        title="PO Document"
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={viewingPoUrl} 
                      alt="PO Document" 
                      className="w-full h-auto rounded border max-h-[70vh] object-contain bg-neutral-50 mx-auto"
                      onError={(e) => {
                        // If image fails to load, try as PDF
                        const target = e.target as HTMLImageElement
                        if (!target.src.includes('.pdf') && !target.src.includes('application/pdf')) {
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="border rounded-lg p-4 bg-neutral-50">
                                <div class="flex items-center justify-between mb-2">
                                  <span class="text-sm font-medium">PO Document</span>
                                  <a href="${target.src}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 text-sm underline">
                                    Open Document
                                  </a>
                                </div>
                                <iframe src="${target.src}" class="w-full h-[70vh] rounded border" title="PO Document"></iframe>
                              </div>
                            `
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client DC Dialog - Full DC Management */}
      <Dialog open={clientDCDialogOpen} onOpenChange={setClientDCDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-[1200px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Request - Manage Products & Details</DialogTitle>
            <DialogDescription>
              Manage products, PO photo, and request details for {selectedDC?.customerName || selectedDC?.dcOrderId?.school_name || 'this client'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            {/* PO Photo Section */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">PO Photo</Label>
              </div>
              {dcPoPhotoUrl ? (
                <div className="relative">
                  {dcPoPhotoUrl.toLowerCase().endsWith('.pdf') || 
                   dcPoPhotoUrl.includes('application/pdf') || 
                   dcPoPhotoUrl.includes('.pdf') ||
                   (dcPoPhotoUrl.startsWith('data:') && dcPoPhotoUrl.includes('application/pdf')) ||
                   (dcPoPhotoUrl.startsWith('http') && dcPoPhotoUrl.toLowerCase().includes('.pdf')) ? (
                    <div className="border rounded-lg p-4 bg-neutral-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">PO Document (PDF)</span>
                        <a 
                          href={dcPoPhotoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          Open PDF in New Tab
                        </a>
                      </div>
                      {dcPoPhotoUrl.startsWith('data:') ? (
                        <iframe 
                          src={dcPoPhotoUrl} 
                          className="w-full h-96 rounded border"
                          title="PO Document"
                        />
                      ) : (
                        <iframe 
                          src={`${dcPoPhotoUrl}#toolbar=0`} 
                          className="w-full h-96 rounded border"
                          title="PO Document"
                        />
                      )}
                    </div>
                  ) : (
                    <img 
                      src={dcPoPhotoUrl} 
                      alt="PO Document" 
                      className="w-full h-auto rounded border max-h-64 object-contain bg-neutral-50"
                      onError={(e) => {
                        // If image fails to load, try as PDF
                        const target = e.target as HTMLImageElement
                        if (!target.src.includes('.pdf') && !target.src.includes('application/pdf')) {
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div class="border rounded-lg p-4 bg-neutral-50">
                                <div class="flex items-center justify-between mb-2">
                                  <span class="text-sm font-medium">PO Document</span>
                                  <a href="${target.src}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 text-sm underline">
                                    Open Document
                                  </a>
                                </div>
                                <iframe src="${target.src}" class="w-full h-96 rounded border" title="PO Document"></iframe>
                              </div>
                            `
                          }
                        }
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm text-neutral-500">No PO photo uploaded</p>
                </div>
              )}
            </div>

            {/* Delivery and Address Table */}
            <div className="border rounded-lg p-6 space-y-4">
              <Label className="text-lg font-semibold mb-4 block">Delivery and Address</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Property Number</Label>
                  <Input
                    value={deliveryAddress.property_number}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>Floor</Label>
                  <Input
                    value={deliveryAddress.floor}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>Tower/Block</Label>
                  <Input
                    value={deliveryAddress.tower_block}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>Nearby Landmark</Label>
                  <Input
                    value={deliveryAddress.nearby_landmark}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>Area</Label>
                  <Input
                    value={deliveryAddress.area}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={deliveryAddress.city}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input
                    value={deliveryAddress.pincode}
                    readOnly
                    disabled
                    className="bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Products & Quantities</Label>
              </div>
              
              {dcProductRows.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm">No products added yet</p>
                  <p className="text-xs mt-1">Use the "Add Product" button below to add products to this client</p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 border-b">
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Product</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Class</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Category</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Specs</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Subject</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Strength</th>
                      <th className="py-3 px-4 text-left text-sm font-semibold border-r">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dcProductRows.map((row, idx) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-3 px-4 border-r">
                          <Input
                            type="text"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.product}
                            readOnly
                            disabled
                          />
                        </td>
                        <td className="py-2 px-3 border-r">
                          <Input
                            type="text"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.class}
                            readOnly
                            disabled
                          />
                        </td>
                        <td className="py-3 px-4 border-r">
                          <Input
                            type="text"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.category}
                            readOnly
                            disabled
                          />
                        </td>
                        <td className="py-3 px-4 border-r">
                          <Input
                            type="text"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.specs || 'Regular'}
                            readOnly
                            disabled
                          />
                        </td>
                        <td className="py-3 px-4 border-r">
                          {row.subject ? (
                            <Input
                              type="text"
                              className="h-10 text-sm bg-neutral-50"
                              value={row.subject}
                              readOnly
                              disabled
                            />
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 border-r">
                          <Input
                            type="number"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.strength || ''}
                            readOnly
                            disabled
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td className="py-3 px-4 border-r">
                          <Input
                            type="text"
                            className="h-10 text-sm bg-neutral-50"
                            value={row.level}
                            readOnly
                            disabled
                          />
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-semibold">
                      <td colSpan={4} className="px-3 py-3 text-right">
                        <span className="text-neutral-700">Total:</span>
                      </td>
                      <td className="px-3 py-3"></td>
                      <td className="px-3 py-3 text-right">
                        {dcProductRows.reduce((sum, row) => sum + (Number(row.strength) || 0), 0)}
                      </td>
                      <td className="px-3 py-3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              )}
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDCDialogOpen(false)}>Cancel</Button>
            <Button onClick={requestClientDC} disabled={savingClientDC}>
              {savingClientDC ? 'Submitting...' : 'Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit PO Dialog */}
      <Dialog open={editPODialogOpen} onOpenChange={setEditPODialogOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-[1000px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit PO - {editFormData.school_name || 'Client'}</DialogTitle>
            <DialogDescription>
              Make changes to the PO. Changes will be saved instantly.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDcOrder && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>School Name</Label>
                  <Input
                    value={editFormData.school_name}
                    onChange={(e) => setEditFormData({ ...editFormData, school_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>School Type</Label>
                  <Input
                    value={editFormData.school_type}
                    onChange={(e) => setEditFormData({ ...editFormData, school_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={editFormData.contact_person}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Mobile</Label>
                  <Input
                    value={editFormData.contact_mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_mobile: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Person 2</Label>
                  <Input
                    value={editFormData.contact_person2}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_person2: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Mobile 2</Label>
                  <Input
                    value={editFormData.contact_mobile2}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_mobile2: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Zone</Label>
                  <Input
                    value={editFormData.zone}
                    onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={editFormData.remarks}
                    onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>PO Photo URL</Label>
                  <Input
                    value={editFormData.pod_proof_url}
                    onChange={(e) => setEditFormData({ ...editFormData, pod_proof_url: e.target.value })}
                    placeholder="Enter PO photo URL"
                  />
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <Input
                    type="number"
                    value={editFormData.total_amount}
                    onChange={(e) => setEditFormData({ ...editFormData, total_amount: Number(e.target.value) || 0 })}
                    readOnly
                  />
                </div>
              </div>

              {/* Delivery and Address Section */}
              <div className="border-t pt-4">
                <Label className="text-lg font-semibold mb-4 block">Delivery and Address</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Property Number *</Label>
                    <Input
                      value={editFormData.property_number}
                      onChange={(e) => setEditFormData({ ...editFormData, property_number: e.target.value })}
                      placeholder="Enter property number"
                    />
                  </div>
                  <div>
                    <Label>Floor *</Label>
                    <Input
                      value={editFormData.floor}
                      onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                      placeholder="Enter floor"
                    />
                  </div>
                  <div>
                    <Label>Tower/Block (Optional)</Label>
                    <Input
                      value={editFormData.tower_block}
                      onChange={(e) => setEditFormData({ ...editFormData, tower_block: e.target.value })}
                      placeholder="Enter tower/block"
                    />
                  </div>
                  <div>
                    <Label>Nearby Landmark (Optional)</Label>
                    <Input
                      value={editFormData.nearby_landmark}
                      onChange={(e) => setEditFormData({ ...editFormData, nearby_landmark: e.target.value })}
                      placeholder="Enter nearby landmark"
                    />
                  </div>
                  <div>
                    <Label>Area *</Label>
                    <Input
                      value={editFormData.area}
                      onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                      placeholder="Enter area"
                    />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <Input
                      value={editFormData.pincode}
                      onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-lg font-semibold">Products</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditProductRows([...editProductRows, {
                        id: Date.now().toString(),
                        product_name: '',
                        quantity: 0,
                        unit_price: 0,
                      }])
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editProductRows.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Select
                              value={row.product_name}
                              onValueChange={(v) => {
                                const updated = [...editProductRows]
                                updated[idx].product_name = v
                                setEditProductRows(updated)
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map((product) => (
                                  <SelectItem key={product} value={product}>
                                    {product}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.quantity}
                              onChange={(e) => {
                                const updated = [...editProductRows]
                                updated[idx].quantity = Number(e.target.value) || 0
                                setEditProductRows(updated)
                                // Update total amount
                                const total = editProductRows.reduce((sum, p, i) => {
                                  if (i === idx) {
                                    return sum + (updated[idx].quantity * updated[idx].unit_price)
                                  }
                                  return sum + (p.quantity * p.unit_price)
                                }, 0)
                                setEditFormData({ ...editFormData, total_amount: total })
                              }}
                              min="0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={row.unit_price}
                              onChange={(e) => {
                                const updated = [...editProductRows]
                                updated[idx].unit_price = Number(e.target.value) || 0
                                setEditProductRows(updated)
                                // Update total amount
                                const total = editProductRows.reduce((sum, p, i) => {
                                  if (i === idx) {
                                    return sum + (updated[idx].quantity * updated[idx].unit_price)
                                  }
                                  return sum + (p.quantity * p.unit_price)
                                }, 0)
                                setEditFormData({ ...editFormData, total_amount: total })
                              }}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>
                          <TableCell>
                            {(row.quantity * row.unit_price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = editProductRows.filter((_, i) => i !== idx)
                                setEditProductRows(updated)
                                // Recalculate total
                                const total = updated.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0)
                                setEditFormData({ ...editFormData, total_amount: total })
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPODialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={savePOChanges}
              disabled={submittingEdit}
            >
              {submittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice View Modal */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice - {invoiceData?.schoolInfo?.customerName || 'Client'}</DialogTitle>
            <DialogDescription>
              Product details and costs for this DC request
            </DialogDescription>
          </DialogHeader>
          
          {invoiceData && (
            <div className="space-y-6 py-4">
              {/* School Information */}
              <div className="border rounded-lg p-4 bg-neutral-50">
                <h3 className="font-semibold text-lg mb-3">School Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neutral-600">School Name:</span>
                    <span className="ml-2 font-medium">{invoiceData.schoolInfo.customerName || '-'}</span>
                  </div>
                  {invoiceData.schoolInfo.schoolCode && (
                    <div>
                      <span className="text-neutral-600">School Code:</span>
                      <span className="ml-2 font-medium">{invoiceData.schoolInfo.schoolCode}</span>
                    </div>
                  )}
                  {invoiceData.schoolInfo.contactName && (
                    <div>
                      <span className="text-neutral-600">Contact Person:</span>
                      <span className="ml-2 font-medium">{invoiceData.schoolInfo.contactName}</span>
                    </div>
                  )}
                  {invoiceData.schoolInfo.mobileNumber && (
                    <div>
                      <span className="text-neutral-600">Mobile:</span>
                      <span className="ml-2 font-medium">{invoiceData.schoolInfo.mobileNumber}</span>
                    </div>
                  )}
                  {invoiceData.schoolInfo.location && (
                    <div>
                      <span className="text-neutral-600">Location:</span>
                      <span className="ml-2 font-medium">{invoiceData.schoolInfo.location}</span>
                    </div>
                  )}
                  {invoiceData.schoolInfo.zone && (
                    <div>
                      <span className="text-neutral-600">Zone:</span>
                      <span className="ml-2 font-medium">{invoiceData.schoolInfo.zone}</span>
                    </div>
                  )}
                  {invoiceData.dcDate && (
                    <div>
                      <span className="text-neutral-600">DC Date:</span>
                      <span className="ml-2 font-medium">{new Date(invoiceData.dcDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-neutral-100 px-4 py-3 border-b">
                  <h3 className="font-semibold text-lg">Products & Pricing</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b">
                        <th className="py-3 px-4 text-left font-semibold">Product</th>
                        <th className="py-3 px-4 text-left font-semibold">Class</th>
                        <th className="py-3 px-4 text-left font-semibold">Category</th>
                        <th className="py-3 px-4 text-left font-semibold">Specs</th>
                        <th className="py-3 px-4 text-left font-semibold">Subject</th>
                        <th className="py-3 px-4 text-right font-semibold">Quantity</th>
                        <th className="py-3 px-4 text-right font-semibold">Strength</th>
                        <th className="py-3 px-4 text-right font-semibold">Level</th>
                        <th className="py-3 px-4 text-right font-semibold">Unit Price</th>
                        <th className="py-3 px-4 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceData.paymentBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-neutral-50">
                          <td className="py-3 px-4 font-medium">{item.product}</td>
                          <td className="py-3 px-4">{item.class}</td>
                          <td className="py-3 px-4">{item.category}</td>
                          <td className="py-3 px-4">{item.specs}</td>
                          <td className="py-3 px-4">{item.subject || '-'}</td>
                          <td className="py-3 px-4 text-right">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">{item.strength}</td>
                          <td className="py-3 px-4 text-right">{item.level}</td>
                          <td className="py-3 px-4 text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-semibold">₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-neutral-100 border-t-2 border-neutral-400 font-bold">
                        <td colSpan={9} className="py-4 px-4 text-right">
                          Grand Total:
                        </td>
                        <td className="py-4 px-4 text-right text-lg">
                          ₹{invoiceData.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Status */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600">Payment Status</p>
                    <p className="text-lg font-semibold text-blue-700">Pending</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Payment will be updated when received (Cash, UPI, etc.)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-600">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-700">₹{invoiceData.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setInvoiceModalOpen(false)
              router.push('/dashboard/payments')
            }}>
              View in Payments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

