import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: true,
    },
  });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if user is approved
  if (!user.isApproved) {
    return res.status(403).json({ error: 'Your account is pending admin approval' });
  }

  const token = jwt.sign(
    { userId: user.id, organizationId: user.organizationId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Remove password hash from response
  const { passwordHash, ...userWithoutPassword } = user;

  res.json({
    token,
    user: userWithoutPassword,
  });
};

export const signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  // Validate role if provided
  const validRoles = ['ADMIN', 'MANAGER', 'MEMBER', 'CLIENT'];
  const userRole = role && validRoles.includes(role) ? role : 'MEMBER';

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  // Get the first/default organization
  const organization = await prisma.organization.findFirst();

  if (!organization) {
    return res.status(500).json({
      error: 'No organization found. Please contact support to set up your organization.'
    });
  }

  // Create user with approval required
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name,
      email,
      passwordHash,
      role: userRole,
      isApproved: false, // All signups require admin approval
    },
  });

  res.status(201).json({
    message: 'Account created successfully. Waiting for admin approval.',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  });
};

export const invite = async (req, res) => {
  const { email, name, role } = req.body;
  const organizationId = req.user.organizationId;

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'Email, name, and role required' });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  // Generate temporary password
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      organizationId,
      name,
      email,
      passwordHash,
      role,
      isApproved: false, // Invited users need approval
    },
  });

  // In production, send email with temp password
  console.log(`Invite user ${email} with temp password: ${tempPassword}`);

  const { passwordHash: _, ...userWithoutPassword } = user;

  res.status(201).json({
    user: userWithoutPassword,
    tempPassword, // Only for demo - remove in production
  });
};

export const me = async (req, res) => {
  const { passwordHash, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
};
