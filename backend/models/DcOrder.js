const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    product_name: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit_price: { type: Number, default: 0, min: 0 },
    expiry_date: { type: Date },
  },
  { _id: false }
);

const dcOrderSchema = new mongoose.Schema(
  {
    dc_code: { type: String, index: true },
    school_name: { type: String, required: true },
    contact_person: { type: String },
    contact_mobile: { type: String },
    contact_person2: { type: String },
    contact_mobile2: { type: String },
    email: { type: String },
    address: { type: String },
    school_type: { type: String },
    branches: { type: Number, default: 0, min: 0 },
    zone: { type: String },
    location: { type: String },
    pincode: { type: String },
    state: { type: String },
    city: { type: String },
    region: { type: String },
    area: { type: String },
    average_fee: { type: Number },
    strength: { type: Number, default: 0, min: 0 },
    products: { type: [productSchema], default: [] },
    priority: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Visit Again', 'Not Met Management', 'Not Interested'], default: 'Hot' },
    lead_status: { type: String, enum: ['Hot', 'Warm', 'Cold'], default: 'Cold', index: true },
    status: {
      type: String,
      enum: ['saved', 'pending', 'in_transit', 'completed', 'hold', 'dc_requested', 'dc_accepted', 'dc_approved', 'dc_sent_to_senior', 'dc_updated'],
      default: 'pending',
      index: true,
    },
    hold: {
      type: Boolean,
      default: false,
    },
    estimated_delivery_date: { type: Date },
    actual_delivery_date: { type: Date },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    follow_up_date: { type: Date },
    remarks: { type: String },
    schoolCategory: {
      type: String,
      enum: ['Hot', 'Warm', 'Visit Again', 'Not Met Management', 'Not Interested'],
    },
    // Location tracking for mobile app
    latitude: { type: Number },
    longitude: { type: Number },
    total_amount: { type: Number, default: 0 },
    pod_proof_url: { type: String },
    completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // History tracking for remarks and updates
    updateHistory: [{
      follow_up_date: { type: Date },
      remarks: { type: String },
      priority: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Dropped', 'Visit Again', 'Not Met Management', 'Not Interested'] },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      updatedAt: { type: Date, default: Date.now },
    }],
    // DC request data (stored when employee requests DC)
    dcRequestData: {
      type: {
        dcDate: { type: Date },
        dcRemarks: { type: String },
        dcNotes: { type: String },
        dcCategory: { type: String },
        requestedQuantity: { type: Number },
        productDetails: { type: Array },
        employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
dcOrderSchema.index({ assigned_to: 1, status: 1 });
dcOrderSchema.index({ assigned_to: 1, follow_up_date: 1 });
dcOrderSchema.index({ status: 1, createdAt: -1 });
dcOrderSchema.index({ school_name: 1, contact_mobile: 1 });

dcOrderSchema.pre('save', async function (next) {
  if (!this.dc_code) {
    try {
      // Get the creator (executive) to fetch their cluster
      const User = mongoose.model('User');
      let creator = null;
      
      // If created_by is populated, use it directly
      if (this.created_by && typeof this.created_by === 'object' && this.created_by.cluster) {
        creator = this.created_by;
      } else if (this.created_by) {
        // If it's just an ObjectId, fetch the user
        creator = await User.findById(this.created_by).select('cluster role');
      }
      
      // Only generate cluster-based code for Executive role
      if (creator && creator.role === 'Executive' && creator.cluster && creator.cluster.trim()) {
        const cluster = creator.cluster.trim();
        
        // Extract first 2 characters as prefix (e.g., "kadc" -> "ka")
        // If cluster is less than 2 characters, pad with 'x' or use fallback
        if (cluster.length < 2) {
          // Fallback if cluster is too short
          this.dc_code = `DC-${Date.now().toString().slice(-6)}`;
          return next();
        }
        
        const prefix = cluster.substring(0, 2).toLowerCase();
        
        // Escape special regex characters in prefix
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Find all existing DcOrders with codes starting with this prefix
        // Pattern: prefix + 3 digits (e.g., "ka001", "ka002")
        const prefixPattern = new RegExp(`^${escapedPrefix}\\d{3}$`, 'i');
        const existingOrders = await this.constructor.find({
          dc_code: prefixPattern
        }).select('dc_code').sort({ dc_code: -1 }).limit(1);
        
        // Get the highest number
        let nextNumber = 1;
        if (existingOrders.length > 0 && existingOrders[0].dc_code) {
          const lastCode = existingOrders[0].dc_code;
          const lastNumber = parseInt(lastCode.substring(2), 10);
          if (!isNaN(lastNumber) && lastNumber < 999) {
            nextNumber = lastNumber + 1;
          } else if (lastNumber >= 999) {
            // If we've reached 999, append a letter (ka999 -> ka999a, ka999b, etc.)
            // For now, fallback to timestamp-based code
            console.warn(`Maximum school codes reached for cluster ${prefix}. Using fallback.`);
            this.dc_code = `DC-${Date.now().toString().slice(-6)}`;
            return next();
          }
        }
        
        // Generate code with zero-padded 3-digit number (e.g., "ka001", "ka002")
        this.dc_code = `${prefix}${String(nextNumber).padStart(3, '0')}`;
      } else {
        // Fallback to old format for non-Executive roles or if cluster is missing
        this.dc_code = `DC-${Date.now().toString().slice(-6)}`;
      }
    } catch (error) {
      // If there's an error, fallback to old format
      console.error('Error generating school code:', error);
      this.dc_code = `DC-${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

module.exports = mongoose.model('DcOrder', dcOrderSchema);


