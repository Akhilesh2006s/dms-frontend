const StockReturn = require('../models/StockReturn');
const Lead = require('../models/Lead');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for stock return photo uploads
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/stock-returns');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'return-photo-' + uniqueSuffix + ext);
  }
});

const photoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: photoFileFilter
});

async function getNextReturnNumber(userId) {
  const latest = await StockReturn.find({ createdBy: userId }).sort({ returnNumber: -1 }).limit(1);
  const latestNum = latest.length > 0 ? latest[0].returnNumber : 0;
  return latestNum + 1;
}

// Executive create
const createExecutiveReturn = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { 
      returnId, 
      leadId, 
      dcOrderId,
      saleId,
      returnDate, 
      returnType,
      customerName,
      warehouse,
      remarks, 
      executiveRemarks,
      lrNumber, 
      finYear, 
      schoolType, 
      schoolCode, 
      products,
      evidencePhotos,
      totalItems,
      totalQuantity,
      status
    } = req.body;
    
    if (!returnDate) return res.status(400).json({ message: 'returnDate is required' });
    if (!returnId) return res.status(400).json({ message: 'returnId is required' });
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'products array is required' });
    }

    // Validate products structure
    for (const product of products) {
      if (!product.product || product.product.trim() === '') {
        return res.status(400).json({ message: 'Product name is required for all products' });
      }
      if (typeof product.soldQty !== 'number' || product.soldQty < 0) {
        return res.status(400).json({ message: 'Valid soldQty is required for all products' });
      }
      if (typeof product.returnQty !== 'number' || product.returnQty < 0) {
        return res.status(400).json({ message: 'Valid returnQty is required for all products' });
      }
      if (!product.reason || product.reason.trim() === '') {
        return res.status(400).json({ message: 'Reason is required for all products' });
      }
    }

    const returnNumber = await getNextReturnNumber(req.user._id);
    
    const doc = await StockReturn.create({
      returnId,
      returnNumber,
      returnDate: new Date(returnDate),
      sourceType: 'Executive',
      createdBy: req.user._id,
      executiveId: req.user._id,
      executiveName: req.user.name || 'Unknown',
      leadId: leadId || undefined,
      dcOrderId: dcOrderId || undefined,
      saleId: saleId || undefined,
      customerName: customerName || '',
      warehouse: warehouse || '',
      returnType: returnType || '',
      remarks: remarks || '',
      executiveRemarks: executiveRemarks || '',
      lrNumber: lrNumber || '',
      finYear: finYear || '',
      schoolType: schoolType || '',
      schoolCode: schoolCode || '',
      products: products.map(p => ({
        product: p.product,
        soldQty: Number(p.soldQty),
        returnQty: Number(p.returnQty),
        reason: p.reason,
        remarks: p.remarks || '',
      })),
      evidencePhotos: evidencePhotos || [],
      totalItems: totalItems || products.length,
      totalQuantity: totalQuantity || products.reduce((sum, p) => sum + (Number(p.returnQty) || 0), 0),
      status: status || 'Submitted',
    });
    
    const populated = await StockReturn.findById(doc._id)
      .populate('createdBy', 'name email')
      .populate('executiveId', 'name email')
      .populate('leadId', 'school_name contact_person location')
      .populate('dcOrderId', 'dc_code school_name');
    
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating executive return:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to create return',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Executive lists - for warehouse executives to see all submitted returns
const listExecutiveReturns = async (req, res) => {
  try {
    const items = await StockReturn.find({ sourceType: 'Executive' })
      .populate('createdBy', 'name email')
      .populate('executiveId', 'name email')
      .populate('leadId', 'school_name contact_person location')
      .populate('dcOrderId', 'dc_code school_name')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listMyExecutiveReturns = async (req, res) => {
  try {
    const items = await StockReturn.find({ sourceType: 'Executive', createdBy: req.user._id })
      .populate('leadId', 'school_name contact_person location')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Warehouse create
const createWarehouseReturn = async (req, res) => {
  try {
    const { returnDate, remarks, lrNumber, finYear, lineItems } = req.body;
    if (!returnDate) return res.status(400).json({ message: 'returnDate is required' });

    const returnNumber = await getNextReturnNumber(req.user._id);
    const doc = await StockReturn.create({
      returnNumber,
      returnDate,
      sourceType: 'Warehouse',
      createdBy: req.user._id,
      remarks: remarks || '',
      lrNumber: lrNumber || '',
      finYear: finYear || '',
      lineItems: Array.isArray(lineItems) ? lineItems : [],
      status: 'Submitted',
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listWarehouseReturns = async (req, res) => {
  try {
    const items = await StockReturn.find({ sourceType: 'Warehouse' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Warehouse Executive verification
const warehouseVerifyReturn = async (req, res) => {
  try {
    const { id } = req.params; // Use _id from URL
    const {
      products,
      warehousePhotos,
      totalReceivedQty,
      status
    } = req.body;

    const returnDoc = await StockReturn.findById(id);
    if (!returnDoc) {
      return res.status(404).json({ message: 'Return not found' });
    }

    // Update with warehouse verification data
    returnDoc.products = products || returnDoc.products;
    returnDoc.warehousePhotos = warehousePhotos || [];
    returnDoc.totalReceivedQty = totalReceivedQty || 0;
    returnDoc.verifiedBy = req.user._id;
    returnDoc.verifiedAt = new Date();
    returnDoc.submittedToManagerAt = new Date();
    
    // Set status based on whether there's a mismatch
    const hasMismatch = products && products.some((p) => p.quantityMismatch);
    returnDoc.status = status || (hasMismatch ? 'Pending Manager Approval' : 'Received');

    await returnDoc.save();

    const populated = await StockReturn.findById(returnDoc._id)
      .populate('createdBy', 'name email')
      .populate('executiveId', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('leadId', 'school_name contact_person location')
      .populate('dcOrderId', 'dc_code school_name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Warehouse Manager actions
const managerAction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      action,
      products,
      managerRemarks,
      rejectionReason,
    } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const returnDoc = await StockReturn.findById(id);
    if (!returnDoc) {
      return res.status(404).json({ message: 'Return not found' });
    }

    // Update product decisions
    if (products && Array.isArray(products)) {
      returnDoc.products = returnDoc.products.map((p) => {
        const decision = products.find(d => d.product === p.product);
        if (decision) {
          return {
            ...p.toObject ? p.toObject() : p,
            managerDecision: decision.managerDecision,
            approvedQty: decision.approvedQty || 0,
            stockBucket: decision.stockBucket || '',
            managerRemark: decision.managerRemark || '',
          };
        }
        return p.toObject ? p.toObject() : p;
      });
    }

    // Update status and process based on action
    let newStatus = returnDoc.status;
    
    if (action === 'approve') {
      // Check if all products are approved
      const allApproved = returnDoc.products.every(p => 
        p.managerDecision === 'Approve' && p.approvedQty > 0
      );
      const hasPartial = returnDoc.products.some(p => 
        p.managerDecision === 'Partial Approve'
      );
      
      if (hasPartial) {
        newStatus = 'Partially Approved';
      } else {
        newStatus = 'Approved';
      }
      
      // Update stock for approved products
      const Warehouse = require('../models/Warehouse');
      const StockMovement = require('../models/StockMovement');
      
      for (const product of returnDoc.products) {
        if ((product.managerDecision === 'Approve' || product.managerDecision === 'Partial Approve') && 
            product.approvedQty > 0 && product.stockBucket) {
          try {
            // Find warehouse item by product name (case-insensitive)
            const warehouseItem = await Warehouse.findOne({
              productName: { $regex: new RegExp(`^${product.product}$`, 'i') }
            });
            
            if (warehouseItem) {
              // Update stock based on bucket
              if (product.stockBucket === 'Sellable') {
                warehouseItem.currentStock = (warehouseItem.currentStock || 0) + product.approvedQty;
                warehouseItem.lastRestocked = new Date();
              } else if (product.stockBucket === 'Damaged') {
                // Track damaged stock separately if you have a field for it
                warehouseItem.currentStock = (warehouseItem.currentStock || 0) + product.approvedQty;
                warehouseItem.lastRestocked = new Date();
              } else if (product.stockBucket === 'Expired') {
                // Track expired stock separately if you have a field for it
                warehouseItem.currentStock = (warehouseItem.currentStock || 0) + product.approvedQty;
                warehouseItem.lastRestocked = new Date();
              } else if (product.stockBucket === 'QC / Hold') {
                // QC/Hold items might not be added to sellable stock
                warehouseItem.currentStock = (warehouseItem.currentStock || 0) + product.approvedQty;
                warehouseItem.lastRestocked = new Date();
              }
              
              await warehouseItem.save();
              
              // Record stock movement
              await StockMovement.create({
                productId: warehouseItem._id,
                movementType: 'Return',
                quantity: product.approvedQty,
                reason: `Stock Return ${returnDoc.returnId} - ${product.stockBucket} - ${product.product}`,
                createdBy: req.user._id,
              });
            } else {
              console.warn(`Warehouse item not found for product: ${product.product}`);
            }
          } catch (err) {
            console.error(`Error updating stock for product ${product.product}:`, err);
            // Continue with other products even if one fails
          }
        }
      }
      
      returnDoc.stockUpdatedAt = new Date();
      returnDoc.stockUpdatedBy = req.user._id;
      newStatus = 'Stock Updated';
    } else if (action === 'reject') {
      newStatus = 'Rejected';
      returnDoc.rejectionReason = rejectionReason || managerRemarks;
    } else if (action === 'send_back') {
      newStatus = 'Sent Back';
    } else if (action === 'vendor_return') {
      returnDoc.vendorReturnMarked = true;
      newStatus = 'Approved'; // Can be adjusted based on workflow
    }

    returnDoc.status = newStatus;
    returnDoc.approvedBy = req.user._id;
    returnDoc.approvedAt = new Date();
    returnDoc.managerRemarks = managerRemarks || '';

    await returnDoc.save();

    const populated = await StockReturn.findById(returnDoc._id)
      .populate('createdBy', 'name email')
      .populate('executiveId', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('leadId', 'school_name contact_person location')
      .populate('dcOrderId', 'dc_code school_name');

    res.json(populated);
  } catch (error) {
    console.error('Error processing manager action:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to process manager action',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Upload photo for stock returns
const uploadReturnPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/stock-returns/${req.file.filename}`;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fullUrl = `${baseUrl}${fileUrl}`;

    res.json({
      message: 'Photo uploaded successfully',
      photoUrl: fullUrl,
      url: fullUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: error.message || 'Failed to upload photo' });
  }
};

module.exports = {
  createExecutiveReturn,
  listExecutiveReturns,
  listMyExecutiveReturns,
  createWarehouseReturn,
  listWarehouseReturns,
  warehouseVerifyReturn,
  managerAction,
  uploadReturnPhoto,
  uploadReturnPhotoMiddleware: uploadPhoto.single('photo'),
};


