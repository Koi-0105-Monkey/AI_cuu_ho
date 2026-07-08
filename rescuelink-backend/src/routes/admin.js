const express = require('express');
const Incident = require('../models/Incident');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply admin/rescuer check to all routes in this router
router.use(protect, authorize('admin', 'rescuer'));

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin/Rescuer only)
router.get('/stats', async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Incidents today
    const todayCount = await Incident.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    });

    // 2. Open incidents
    const openCount = await Incident.countDocuments({ status: 'open' });

    // 3. Resolved incidents
    const resolvedCount = await Incident.countDocuments({ status: 'resolved' });

    // 4. Active users (number of active/emergency trips)
    const activeUsers = await Trip.countDocuments({
      status: { $in: ['active', 'emergency'] }
    });

    res.json({
      success: true,
      stats: {
        todayCount,
        openCount,
        resolvedCount,
        activeUsers
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get active/open incidents
// @route   GET /api/admin/incidents/active
// @access  Private (Admin/Rescuer only)
router.get('/incidents/active', async (req, res, next) => {
  try {
    const incidents = await Incident.find({ status: 'open' })
      .populate('userId', 'name phone')
      .populate('tripId', 'routeName expectedReturn')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get active trekking trips
// @route   GET /api/admin/trips/active
// @access  Private (Admin/Rescuer only)
router.get('/trips/active', async (req, res, next) => {
  try {
    const trips = await Trip.find({ status: { $in: ['active', 'emergency'] } })
      .populate('userId', 'name phone')
      .sort({ lastSeen: -1 });

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    next(error);
  }
});


// @desc    Get all users list (with search & pagination)
// @route   GET /api/admin/users
// @access  Private (Admin/Rescuer only)
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 25 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { phone: regex }];
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Rescue HQ analytics (average response time, resolution time, incident counts)
// @route   GET /api/admin/analytics
// @access  Private (Admin/Rescuer only)
router.get('/analytics', async (req, res, next) => {
  try {
    const resolvedIncidents = await Incident.find({ status: 'resolved' });
    
    // 1. Calculate average response time and resolution time
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let countWithMetrics = 0;

    resolvedIncidents.forEach(inc => {
      if (inc.afterActionReport && inc.afterActionReport.responseTimeMinutes !== undefined) {
        totalResponseTime += inc.afterActionReport.responseTimeMinutes;
        totalResolutionTime += inc.afterActionReport.resolutionTimeMinutes;
        countWithMetrics++;
      }
    });

    const avgResponseTime = countWithMetrics > 0 ? Math.round(totalResponseTime / countWithMetrics) : 0;
    const avgResolutionTime = countWithMetrics > 0 ? Math.round(totalResolutionTime / countWithMetrics) : 0;

    // 2. Incident distribution by type
    const incidents = await Incident.find({});
    const typeDistribution = {
      CRASH: 0,
      LOST: 0,
      FIRE: 0,
      MED: 0,
      VEH: 0,
      MANUAL: 0
    };

    incidents.forEach(inc => {
      if (typeDistribution[inc.type] !== undefined) {
        typeDistribution[inc.type]++;
      } else {
        typeDistribution[inc.type] = 1;
      }
    });

    // 3. Overall stats
    const totalCount = incidents.length;
    const resolvedCount = resolvedIncidents.length;
    const openCount = await Incident.countDocuments({ status: 'open' });
    const assignedCount = await Incident.countDocuments({ status: 'assigned' });

    // 4. Monthly metrics for past 6 months
    const monthlyMetrics = [];
    const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const resolvedThisMonth = await Incident.find({
        status: 'resolved',
        resolvedAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      let monthlyRespSum = 0;
      let monthlyCount = 0;
      resolvedThisMonth.forEach(inc => {
        if (inc.afterActionReport && inc.afterActionReport.responseTimeMinutes !== undefined) {
          monthlyRespSum += inc.afterActionReport.responseTimeMinutes;
          monthlyCount++;
        }
      });

      monthlyMetrics.push({
        name: months[d.getMonth()],
        total: await Incident.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
        resolved: resolvedThisMonth.length,
        avgResponseTime: monthlyCount > 0 ? Math.round(monthlyRespSum / monthlyCount) : 15 // fallback default
      });
    }

    res.json({
      success: true,
      stats: {
        totalCount,
        openCount,
        assignedCount,
        resolvedCount,
        avgResponseTime,
        avgResolutionTime,
        typeDistribution,
        monthlyMetrics
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
