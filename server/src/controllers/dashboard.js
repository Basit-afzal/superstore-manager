import mongoose from 'mongoose';
import Product from '../models/products.js';
import Sale from '../models/sale.js';
import Employee from '../models/employee.js';

function getDateRange(period, startDate, endDate) {
  const now = new Date();

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'custom' && startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function getPreviousRange(start, end) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd.getTime() - duration);
  prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

function percentChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function getTotalProfit(storeId, start, end) {
  const result = await Sale.aggregate([
    {
      $match: {
        store_id: storeId,
        created_at: { $gte: start, $lte: end },
      },
    },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.product_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: null,
        totalProfit: {
          $sum: {
            $multiply: [
              {
                $subtract: [
                  '$product.selling_price',
                  '$product.cost_price',
                ],
              },
              '$items.quantity',
            ],
          },
        },
      },
    },
  ]);

  return result[0]?.totalProfit || 0;
}

async function getSalesCount(storeId, start, end) {
  return Sale.countDocuments({
    store_id: storeId,
    created_at: { $gte: start, $lte: end },
  });
}

async function getSnapshotCount(Model, storeId, end) {
  return Model.countDocuments({
    store_id: storeId,
    created_at: { $lte: end },
  });
}

export const getDashboardStats = async (req, res) => {
  try {
    const storeId = new mongoose.Types.ObjectId(String(req.store));
    const period = req.query.period || 'current_month';
    const { startDate, endDate } = req.query;

    if (period === 'custom' && (!startDate || !endDate)) {
      return res.status(400).json({ message: 'startDate and endDate are required for custom period' });
    }

    const { start, end } = getDateRange(period, startDate, endDate);

    if (period === 'custom' && start > end) {
      return res.status(400).json({ message: 'startDate must be before endDate' });
    }

    const previous = getPreviousRange(start, end);

    const [
      totalProfit,
      totalSales,
      totalProducts,
      totalEmployees,
      prevProfit,
      prevSales,
      prevProducts,
      prevEmployees,
    ] = await Promise.all([
      getTotalProfit(storeId, start, end),
      getSalesCount(storeId, start, end),
      getSnapshotCount(Product, storeId, end),
      getSnapshotCount(Employee, storeId, end),
      getTotalProfit(storeId, previous.start, previous.end),
      getSalesCount(storeId, previous.start, previous.end),
      getSnapshotCount(Product, storeId, previous.end),
      getSnapshotCount(Employee, storeId, previous.end),
    ]);

    return res.status(200).json({
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalProfit,
      totalSales,
      totalProducts,
      totalEmployees,
      comparison: {
        profitChange: percentChange(totalProfit, prevProfit),
        salesChange: percentChange(totalSales, prevSales),
        productsChange: totalProducts - prevProducts,
        employeesChange: totalEmployees - prevEmployees,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'Failed to fetch dashboard stats',
    });
  }
};
