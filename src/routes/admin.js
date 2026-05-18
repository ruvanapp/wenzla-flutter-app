import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { logAdminActivity } from '../services/audit.js';
import { getCommissionPercentage, setCommissionPercentage } from '../services/settings.js';

export const adminRouter = Router();

adminRouter.use(requireAuth(['ADMIN']));

const VALID_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

const employeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6).max(128)
});

const productSchema = z.object({
  merchantId: z.string(),
  categoryId: z.string().optional(),
  name: z.string().min(2).max(200),
  description: z.string().min(2).max(2000),
  weight: z.string().min(1).max(50),
  price: z.number().positive().max(999999),
  imageUrl: z.string().max(500).refine((value) => value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'), 'Image URL must be a relative upload path or valid URL'),
  stock: z.number().int().min(0).max(99999).default(0),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional()
});

adminRouter.get('/overview', async (_req, res) => {
  const [merchants, products, orders, delivered, employees] = await Promise.all([
    prisma.merchant.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { total: true, commissionAmount: true }
    }),
    prisma.user.count({ where: { role: 'ADMIN' } })
  ]);

  res.json({
    merchants,
    products,
    orders,
    employees,
    sales: Number(delivered._sum.total ?? 0),
    commission: Number(delivered._sum.commissionAmount ?? 0)
  });
});

adminRouter.get('/employees', async (_req, res) => {
  const employees = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(employees);
});

adminRouter.post('/employees', async (req, res) => {
  const data = employeeSchema.parse(req.body);
  const existingUser = await prisma.user.findFirst({
    where: { username: data.username }
  });

  if (existingUser) {
    return res.status(409).json({ message: 'Username already exists' });
  }

  const password = await bcrypt.hash(data.password, 12);
  const employee = await prisma.user.create({
    data: {
      username: data.username,
      name: data.name ?? data.username,
      password,
      role: 'ADMIN'
    },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true
    }
  });

  await logAdminActivity(req, {
    action: 'CREATE',
    entityType: 'EMPLOYEE',
    entityId: employee.id,
    description: `Created employee ${employee.username}`,
    details: { username: employee.username, name: employee.name }
  });

  res.status(201).json(employee);
});

adminRouter.patch('/employees/:id/password', async (req, res) => {
  const { password } = z.object({
    password: z.string().min(6).max(128)
  }).parse(req.body);

  const employee = await prisma.user.findFirst({
    where: { id: req.params.id, role: 'ADMIN' },
    select: { id: true, username: true, name: true }
  });

  if (!employee) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: req.params.id },
    data: { password: hashedPassword }
  });

  await logAdminActivity(req, {
    action: 'RESET_PASSWORD',
    entityType: 'EMPLOYEE',
    entityId: employee.id,
    description: `Reset password for ${employee.username}`,
    details: { username: employee.username }
  });

  res.json({ message: 'Password updated successfully' });
});

adminRouter.get('/activities', async (_req, res) => {
  const activities = await prisma.adminActivity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  res.json(activities);
});

adminRouter.get('/merchants', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const defaultCommissionPercentage = await getCommissionPercentage();

  const merchants = await prisma.merchant.findMany({
    include: { user: { select: { id: true, phone: true, name: true, role: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize
  });

  res.json(merchants.map((merchant) => ({
    ...merchant,
    commissionPercentage: merchant.commissionPercentage == null ? null : Number(merchant.commissionPercentage),
    effectiveCommissionPercentage: Number(merchant.commissionPercentage ?? defaultCommissionPercentage)
  })));
});

adminRouter.patch('/merchants/:id', async (req, res) => {
  const data = z.object({
    storeName: z.string().min(2).max(100).optional(),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().max(500).optional().refine((value) => !value || value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'), 'Logo URL must be a relative upload path or valid URL'),
    address: z.string().max(500).optional()
  }).parse(req.body);

  const merchant = await prisma.merchant.update({
    where: { id: req.params.id },
    data
  });

  await logAdminActivity(req, {
    action: 'UPDATE',
    entityType: 'MERCHANT',
    entityId: merchant.id,
    description: `Updated merchant ${merchant.storeName}`,
    details: data
  });

  res.json(merchant);
});

adminRouter.patch('/merchants/:id/status', async (req, res) => {
  const { status, blockedReason } = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED']),
    blockedReason: z.string().max(500).optional()
  }).parse(req.body);

  const before = await prisma.merchant.findUnique({ where: { id: req.params.id } });
  const merchant = await prisma.merchant.update({
    where: { id: req.params.id },
    data: { status, blockedReason }
  });

  await logAdminActivity(req, {
    action: 'UPDATE_STATUS',
    entityType: 'MERCHANT',
    entityId: merchant.id,
    description: `Changed merchant ${merchant.storeName} status to ${status}`,
    details: { from: before?.status ?? null, to: status, blockedReason: blockedReason ?? null }
  });

  res.json(merchant);
});

adminRouter.patch('/merchants/:id/commission', async (req, res) => {
  const { percentage } = z.object({
    percentage: z.number().min(0).max(100).nullable()
  }).parse(req.body);

  const merchant = await prisma.merchant.update({
    where: { id: req.params.id },
    data: { commissionPercentage: percentage }
  });

  await logAdminActivity(req, {
    action: 'UPDATE_COMMISSION',
    entityType: 'MERCHANT',
    entityId: merchant.id,
    description: `Changed ${merchant.storeName} commission to ${percentage == null ? 'default' : `${percentage}%`}`,
    details: { commissionPercentage: percentage }
  });

  res.json({
    ...merchant,
    commissionPercentage: merchant.commissionPercentage == null ? null : Number(merchant.commissionPercentage)
  });
});

adminRouter.get('/products', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

  const products = await prisma.product.findMany({
    include: { merchant: true, category: true },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize
  });

  res.json(products);
});

adminRouter.patch('/products/:id/status', async (req, res) => {
  const { status } = z.object({
    status: z.enum(['ACTIVE', 'BLOCKED'])
  }).parse(req.body);

  const before = await prisma.product.findUnique({ where: { id: req.params.id } });
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { status }
  });

  await logAdminActivity(req, {
    action: 'UPDATE_STATUS',
    entityType: 'PRODUCT',
    entityId: product.id,
    description: `Changed product ${product.name} status to ${status}`,
    details: { from: before?.status ?? null, to: status }
  });

  res.json(product);
});

adminRouter.get('/orders', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));

  const orders = await prisma.order.findMany({
    include: { merchant: true, items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
    take: pageSize,
    skip: (page - 1) * pageSize
  });

  res.json(orders);
});

adminRouter.patch('/orders/:id/status', async (req, res) => {
  const { status } = z.object({
    status: z.enum(['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'])
  }).parse(req.body);

  const existingOrder = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { merchant: true }
  });

  if (!existingOrder) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const allowedNext = VALID_TRANSITIONS[existingOrder.status] || [];
  if (!allowedNext.includes(status)) {
    return res.status(400).json({
      message: `Cannot change order from ${existingOrder.status} to ${status}. Allowed: ${allowedNext.join(', ') || 'none'}`
    });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status }
  });

  await logAdminActivity(req, {
    action: 'UPDATE_STATUS',
    entityType: 'ORDER',
    entityId: order.id,
    description: `Changed order ${order.id} status to ${status}`,
    details: { from: existingOrder.status, to: status, merchantId: existingOrder.merchantId }
  });

  res.json(order);
});

adminRouter.post('/products', async (req, res) => {
  const data = productSchema.parse(req.body);
  const product = await prisma.product.create({ data });

  await logAdminActivity(req, {
    action: 'CREATE',
    entityType: 'PRODUCT',
    entityId: product.id,
    description: `Created product ${product.name}`,
    details: data
  });

  res.status(201).json(product);
});

adminRouter.patch('/products/:id', async (req, res) => {
  const data = productSchema.omit({ merchantId: true }).partial().parse(req.body);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data
  });

  await logAdminActivity(req, {
    action: 'UPDATE',
    entityType: 'PRODUCT',
    entityId: product.id,
    description: `Updated product ${product.name}`,
    details: data
  });

  res.json(product);
});

adminRouter.delete('/products/:id', async (req, res) => {
  const product = await prisma.product.delete({ where: { id: req.params.id } });

  await logAdminActivity(req, {
    action: 'DELETE',
    entityType: 'PRODUCT',
    entityId: product.id,
    description: `Deleted product ${product.name}`,
    details: { name: product.name }
  });

  res.status(204).send();
});

adminRouter.post('/categories', async (req, res) => {
  const { name } = z.object({ name: z.string().min(2).max(100) }).parse(req.body);
  const category = await prisma.category.create({ data: { name } });

  await logAdminActivity(req, {
    action: 'CREATE',
    entityType: 'CATEGORY',
    entityId: category.id,
    description: `Created category ${category.name}`,
    details: { name: category.name }
  });

  res.status(201).json(category);
});

adminRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
});

adminRouter.patch('/categories/:id', async (req, res) => {
  const { name } = z.object({ name: z.string().min(2).max(100) }).parse(req.body);
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name }
  });

  await logAdminActivity(req, {
    action: 'UPDATE',
    entityType: 'CATEGORY',
    entityId: category.id,
    description: `Updated category ${category.name}`,
    details: { name: category.name }
  });

  res.json(category);
});

adminRouter.delete('/categories/:id', async (req, res) => {
  const category = await prisma.category.delete({ where: { id: req.params.id } });

  await logAdminActivity(req, {
    action: 'DELETE',
    entityType: 'CATEGORY',
    entityId: category.id,
    description: `Deleted category ${category.name}`,
    details: { name: category.name }
  });

  res.status(204).send();
});

adminRouter.put('/settings/commission', async (req, res) => {
  const { percentage } = z.object({
    percentage: z.number().min(0).max(100)
  }).parse(req.body);

  const setting = await setCommissionPercentage(percentage);

  await logAdminActivity(req, {
    action: 'UPDATE',
    entityType: 'SETTING',
    entityId: 'commissionPercentage',
    description: `Changed default commission to ${percentage}%`,
    details: { percentage }
  });

  res.json(setting);
});

adminRouter.get('/settings/commission', async (_req, res) => {
  const percentage = await getCommissionPercentage();
  res.json({ percentage });
});

adminRouter.get('/reports', async (_req, res) => {
  const [ordersByStatus, merchantsByStatus, topMerchants] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      _count: true,
      _sum: { total: true }
    }),
    prisma.merchant.groupBy({
      by: ['status'],
      _count: true
    }),
    prisma.order.groupBy({
      by: ['merchantId'],
      where: { status: 'DELIVERED' },
      _sum: { total: true, commissionAmount: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: 10
    })
  ]);

  res.json({
    ordersByStatus,
    merchantsByStatus,
    topMerchants
  });
});

adminRouter.get('/commissions', async (_req, res) => {
  const defaultCommissionPercentage = await getCommissionPercentage();
  const commissions = await prisma.order.groupBy({
    by: ['merchantId'],
    where: { status: 'DELIVERED' },
    _sum: { total: true, commissionAmount: true },
    _count: true
  });

  const merchants = await prisma.merchant.findMany({
    where: { id: { in: commissions.map((item) => item.merchantId) } }
  });
  const merchantMap = new Map(merchants.map((merchant) => [merchant.id, merchant]));

  res.json(commissions.map((item) => ({
    merchant: merchantMap.get(item.merchantId),
    deliveredOrders: item._count,
    totalSales: Number(item._sum.total ?? 0),
    commissionOwed: Number(item._sum.commissionAmount ?? 0),
    currentCommissionPercentage: Number(merchantMap.get(item.merchantId)?.commissionPercentage ?? defaultCommissionPercentage)
  })));
});