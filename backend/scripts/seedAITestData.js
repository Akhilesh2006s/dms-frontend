const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Lead = require('../models/Lead');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const DC = require('../models/DC');
const Expense = require('../models/Expense');
const User = require('../models/User');
const DcOrder = require('../models/DcOrder');

dotenv.config();

// Connect to database
const connectDB = require('../config/db');

const PRODUCTS = [
  'Abacus', 'Vedic Maths', 'EEL', 'IIT', 'Financial Literacy', 
  'Brain Bytes', 'Spelling Bee', 'Skill Pro', 'Maths Lab', 'Codechamp'
];

const ZONES = ['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Northwest'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat'];
const PRIORITIES = ['Hot', 'Warm', 'Cold'];
const STATUSES = {
  lead: ['Pending', 'Processing', 'Saved', 'Closed'],
  sale: ['Pending', 'Confirmed', 'In Progress', 'Closed', 'Completed', 'Cancelled'],
  payment: ['Pending', 'Approved', 'Hold', 'Rejected'],
  dc: ['created', 'po_submitted', 'sent_to_manager', 'pending_dc', 'warehouse_processing', 'completed', 'hold']
};

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedLeads(count = 500) {
  console.log(`\n🌱 Seeding ${count} Leads...`);
  
  const users = await User.find({ role: { $in: ['Executive', 'Manager', 'Sales BDE'] } }).limit(10);
  if (users.length === 0) {
    console.log('⚠️  No users found. Creating a test user...');
    const testUser = await User.create({
      name: 'Test Executive',
      email: 'test@example.com',
      password: 'test123',
      role: 'Executive',
      zone: 'North'
    });
    users.push(testUser);
  }

  const leads = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const createdDate = randomDate(sixMonthsAgo, now);
    const followUpDate = randomDate(createdDate, new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000));
    
    const productCount = randomInt(1, 3);
    const products = [];
    for (let j = 0; j < productCount; j++) {
      products.push({
        product_name: randomElement(PRODUCTS),
        quantity: randomInt(1, 5),
        unit_price: randomInt(5000, 50000)
      });
    }

    const totalAmount = products.reduce((sum, p) => sum + (p.unit_price * p.quantity), 0);
    const status = randomElement(STATUSES.lead);
    
    leads.push({
      school_name: `Test School ${i + 1}`,
      contact_person: `Contact Person ${i + 1}`,
      contact_mobile: `9${randomInt(100000000, 999999999)}`,
      products: products,
      location: `Location ${i + 1}`,
      pincode: randomInt(100000, 999999).toString(),
      state: randomElement(STATES),
      city: randomElement(CITIES),
      zone: randomElement(ZONES),
      priority: randomElement(PRIORITIES),
      status: status,
      follow_up_date: followUpDate,
      strength: randomInt(100, 2000),
      createdBy: randomElement(users)._id,
      managed_by: randomElement(users)._id,
      createdAt: createdDate,
      updatedAt: randomDate(createdDate, now)
    });
  }

  await Lead.insertMany(leads);
  console.log(`✅ Created ${count} leads`);
}

async function seedSales(count = 500) {
  console.log(`\n🌱 Seeding ${count} Sales...`);
  
  const users = await User.find({ role: { $in: ['Executive', 'Manager'] } }).limit(10);
  const leads = await Lead.find().limit(100);
  
  const sales = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const saleDate = randomDate(sixMonthsAgo, now);
    const unitPrice = randomInt(10000, 100000);
    const quantity = randomInt(1, 10);
    const totalAmount = unitPrice * quantity;
    const status = randomElement(STATUSES.sale);
    
    sales.push({
      leadId: leads.length > 0 ? randomElement(leads)._id : null,
      customerName: `Customer ${i + 1}`,
      customerEmail: `customer${i + 1}@example.com`,
      customerPhone: `9${randomInt(100000000, 999999999)}`,
      product: randomElement(PRODUCTS),
      quantity: quantity,
      unitPrice: unitPrice,
      totalAmount: totalAmount,
      status: status,
      paymentStatus: status === 'Closed' ? 'Paid' : randomElement(['Pending', 'Partial', 'Paid', 'Overdue']),
      assignedTo: randomElement(users)._id,
      saleDate: saleDate,
      createdBy: randomElement(users)._id,
      createdAt: saleDate,
      updatedAt: randomDate(saleDate, now)
    });
  }

  await Sale.insertMany(sales);
  console.log(`✅ Created ${count} sales`);
}

async function seedPayments(count = 500) {
  console.log(`\n🌱 Seeding ${count} Payments...`);
  
  const users = await User.find().limit(10);
  const sales = await Sale.find().limit(100);
  
  const payments = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const paymentMethods = ['Cash', 'UPI', 'NEFT/RTGS', 'Cheque', 'Bank Transfer', 'Online Payment'];

  for (let i = 0; i < count; i++) {
    const paymentDate = randomDate(sixMonthsAgo, now);
    const amount = randomInt(5000, 200000);
    const status = randomElement(STATUSES.payment);
    const isApproved = status === 'Approved';
    
    payments.push({
      saleId: sales.length > 0 ? randomElement(sales)._id : null,
      customerName: `Customer ${i + 1}`,
      amount: amount,
      paymentMethod: randomElement(paymentMethods),
      paymentDate: paymentDate,
      status: status,
      schoolCode: `SCH${randomInt(1000, 9999)}`,
      contactName: `Contact ${i + 1}`,
      mobileNumber: `9${randomInt(100000000, 999999999)}`,
      location: randomElement(CITIES),
      zone: randomElement(ZONES),
      createdBy: randomElement(users)._id,
      approvedBy: isApproved ? randomElement(users)._id : null,
      approvedAt: isApproved ? randomDate(paymentDate, now) : null,
      createdAt: paymentDate,
      updatedAt: randomDate(paymentDate, now)
    });
  }

  await Payment.insertMany(payments);
  console.log(`✅ Created ${count} payments`);
}

async function seedDCs(count = 100) {
  console.log(`\n🌱 Seeding ${count} DCs...`);
  
  const users = await User.find({ role: { $in: ['Executive', 'Warehouse Executive'] } }).limit(10);
  const sales = await Sale.find().limit(100);
  const dcOrders = await DcOrder.find().limit(100);
  
  if (sales.length === 0 && dcOrders.length === 0) {
    console.log('⚠️  No sales or DC orders found. Creating DCs with dcOrderId only...');
    // Create some DC orders first if none exist
    if (dcOrders.length === 0) {
      await seedDcOrders(50);
      const newDcOrders = await DcOrder.find().limit(50);
      dcOrders.push(...newDcOrders);
    }
  }
  
  const dcs = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const createdDate = randomDate(sixMonthsAgo, now);
    const status = randomElement(STATUSES.dc);
    const isCompleted = status === 'completed';
    const deliveryDate = randomDate(createdDate, new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000));
    
    const productCount = randomInt(1, 3);
    const productDetails = [];
    let totalAmount = 0;
    
    for (let j = 0; j < productCount; j++) {
      const quantity = randomInt(10, 100);
      const price = randomInt(500, 5000);
      const total = quantity * price;
      totalAmount += total;
      
      productDetails.push({
        product: randomElement(PRODUCTS),
        class: `Class ${randomInt(1, 12)}`,
        category: 'Regular',
        quantity: quantity,
        strength: randomInt(50, 500),
        price: price,
        total: total,
        level: 'L2',
        specs: 'Regular',
        term: randomElement(['Term 1', 'Term 2', 'Both'])
      });
    }
    
    // Ensure at least one of saleId or dcOrderId is provided
    let saleId = null;
    let dcOrderId = null;
    
    if (sales.length > 0 && dcOrders.length > 0) {
      // Randomly choose one
      if (Math.random() > 0.5) {
        saleId = randomElement(sales)._id;
      } else {
        dcOrderId = randomElement(dcOrders)._id;
      }
    } else if (sales.length > 0) {
      saleId = randomElement(sales)._id;
    } else if (dcOrders.length > 0) {
      dcOrderId = randomElement(dcOrders)._id;
    } else {
      // If neither exists, skip this DC
      console.log(`⚠️  Skipping DC ${i + 1} - no sales or DC orders available`);
      continue;
    }
    
    dcs.push({
      saleId: saleId,
      dcOrderId: dcOrderId,
      employeeId: randomElement(users)._id,
      customerName: `Customer ${i + 1}`,
      customerPhone: `9${randomInt(100000000, 999999999)}`,
      product: randomElement(PRODUCTS),
      requestedQuantity: randomInt(50, 500),
      availableQuantity: randomInt(50, 500),
      deliverableQuantity: randomInt(50, 500),
      deliveryDate: deliveryDate,
      status: status,
      productDetails: productDetails,
      createdBy: randomElement(users)._id,
      createdAt: createdDate,
      completedAt: isCompleted ? randomDate(createdDate, now) : null,
      completedBy: isCompleted ? randomElement(users)._id : null,
      updatedAt: randomDate(createdDate, now)
    });
  }

  if (dcs.length > 0) {
    await DC.insertMany(dcs);
    console.log(`✅ Created ${dcs.length} DCs`);
  } else {
    console.log('⚠️  No DCs created - no sales or DC orders available');
  }
}

async function seedExpenses(count = 500) {
  console.log(`\n🌱 Seeding ${count} Expenses...`);
  
  const users = await User.find().limit(10);
  
  const expenses = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const categories = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Marketing', 'Other'];
  const expenseStatuses = ['Pending', 'Executive Manager Approved', 'Manager Approved', 'Approved', 'Rejected'];

  for (let i = 0; i < count; i++) {
    const expenseDate = randomDate(sixMonthsAgo, now);
    const amount = randomInt(500, 50000);
    const status = randomElement(expenseStatuses);
    const isApproved = status === 'Approved' || status === 'Manager Approved' || status === 'Executive Manager Approved';
    
    expenses.push({
      title: `Expense ${i + 1}`,
      amount: amount,
      category: randomElement(categories),
      description: `Description for expense ${i + 1}`,
      date: expenseDate,
      status: status,
      createdBy: randomElement(users)._id,
      employeeId: randomElement(users)._id,
      approvedBy: isApproved ? randomElement(users)._id : null,
      approvedAt: isApproved ? randomDate(expenseDate, now) : null,
      createdAt: expenseDate,
      updatedAt: randomDate(expenseDate, now)
    });
  }

  await Expense.insertMany(expenses);
  console.log(`✅ Created ${count} expenses`);
}

async function seedDcOrders(count = 500) {
  console.log(`\n🌱 Seeding ${count} DC Orders...`);
  
  const users = await User.find().limit(10);
  
  const dcOrders = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const dcOrderStatuses = ['saved', 'pending', 'in_transit', 'completed', 'hold', 'dc_requested', 'dc_accepted', 'dc_approved'];

  for (let i = 0; i < count; i++) {
    const createdDate = randomDate(sixMonthsAgo, now);
    const productCount = randomInt(1, 3);
    const products = [];
    let totalAmount = 0;
    
    for (let j = 0; j < productCount; j++) {
      const unitPrice = randomInt(500, 5000);
      const quantity = randomInt(10, 100);
      products.push({
        product_name: randomElement(PRODUCTS),
        quantity: quantity,
        unit_price: unitPrice
      });
      totalAmount += unitPrice * quantity;
    }
    
    dcOrders.push({
      school_name: `School ${i + 1}`,
      contact_person: `Contact ${i + 1}`,
      contact_mobile: `9${randomInt(100000000, 999999999)}`,
      location: randomElement(CITIES),
      zone: randomElement(ZONES),
      state: randomElement(STATES),
      city: randomElement(CITIES),
      products: products,
      total_amount: totalAmount,
      priority: randomElement(PRIORITIES),
      status: randomElement(dcOrderStatuses),
      created_by: randomElement(users)._id,
      assigned_to: randomElement(users)._id,
      createdAt: createdDate,
      updatedAt: randomDate(createdDate, now)
    });
  }

  await DcOrder.insertMany(dcOrders);
  console.log(`✅ Created ${count} DC Orders`);
}

async function seedManagers(count = 20) {
  console.log(`\n🌱 Seeding ${count} Managers...`);
  
  const managers = [];
  
  for (let i = 0; i < count; i++) {
    managers.push({
      name: `Manager ${i + 1}`,
      email: `manager${i + 1}@example.com`,
      password: 'test123',
      role: Math.random() > 0.5 ? 'Manager' : 'Executive Manager',
      zone: randomElement(ZONES),
      state: randomElement(STATES),
      city: randomElement(CITIES),
      isActive: true
    });
  }

  // Check if managers already exist
  for (const manager of managers) {
    const existing = await User.findOne({ email: manager.email });
    if (!existing) {
      // User model will automatically hash password via pre-save hook
      await User.create(manager);
    }
  }
  
  console.log(`✅ Created/Verified ${count} managers`);
}

async function seedAll() {
  try {
    await connectDB();
    console.log('✅ Connected to database');
    
    console.log('\n🚀 Starting AI Test Data Seeding...');
    console.log('This will create 500 records for each data type needed by AI tools.\n');
    
    // Seed managers first (needed for other data)
    await seedManagers(20);
    
    // Seed all data types
    await seedLeads(500);
    await seedSales(500);
    await seedPayments(500);
    await seedDcOrders(500); // Seed DC orders before DCs
    await seedDCs(100); // Seed 100 DCs (they need saleId or dcOrderId)
    await seedExpenses(500);
    
    console.log('\n✅ All AI test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 500 Leads');
    console.log('  - 500 Sales');
    console.log('  - 500 Payments');
    console.log('  - 100 DCs');
    console.log('  - 500 Expenses');
    console.log('  - 500 DC Orders');
    console.log('  - 20 Managers/Executives');
    console.log('\n🎉 You can now test all AI tools with this data!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAll();
