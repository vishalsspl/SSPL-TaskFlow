import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { getActiveFeatures } from '../controllers/authController.js';

/**
 * Authentication middleware
 * 
 * Verifies JWT token and looks up user in the MAIN database.
 * The MAIN DB stores all user auth records (email, passwordHash, role, organizationId).
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Look up user in MAIN DB (auth lookup table)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Resolve active features for the organization
    const activeFeatures = await getActiveFeatures(user.organization);
    user.activeFeatures = activeFeatures;

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
