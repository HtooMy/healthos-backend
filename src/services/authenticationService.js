const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { sendVerificationEmail } = require('./emailService');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function buildUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isEmailVerified: Boolean(user.isEmailVerified),
  };
}

function createAuthError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateVerificationToken() {
  return generateVerificationCode();
}

async function registerUser({ name, email, password }) {
  if (!name || !email || !password) {
    throw createAuthError(400, 'Name, email, and password are required.');
  }

  const cleanName = String(name).trim();
  const normalizedEmail = normalizeEmail(email);

  if (!cleanName) {
    throw createAuthError(400, 'Name cannot be empty.');
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw createAuthError(400, 'Please provide a valid email address.');
  }

  if (String(password).length < 6) {
    throw createAuthError(400, 'Password must be at least 6 characters long.');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createAuthError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const emailVerificationCode = generateVerificationCode();
  const emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const user = await User.create({
    name: cleanName,
    email: normalizedEmail,
    passwordHash,
    isEmailVerified: false,
    emailVerificationToken: emailVerificationCode,
    emailVerificationExpiresAt,
  });

  try {
    await sendVerificationEmail({
      email: user.email,
      name: user.name,
      code: emailVerificationCode,
    });
  } catch (sendError) {
    // Keep registration successful even if mail delivery fails. The user can request a resend.
  }

  const token = signToken(user);

  return {
    token,
    expiresIn: '7d',
    message: 'Registration successful. Please verify your email address.',
    user: buildUserPayload(user),
  };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw createAuthError(400, 'Email and password are required.');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw createAuthError(401, 'Invalid email or password.');
  }

  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isEmailVerified) {
    throw createAuthError(403, 'Please verify your email before logging in.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw createAuthError(401, 'Invalid email or password.');
  }

  const token = signToken(user);

  return {
    token,
    expiresIn: '7d',
    user: buildUserPayload(user),
  };
}

async function resendConfirmationEmail({ email }) {
  if (!email) {
    throw createAuthError(400, 'Email is required.');
  }

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw createAuthError(404, 'No account found with that email address.');
  }

  if (user.isEmailVerified) {
    return {
      message: 'This email is already verified.',
    };
  }

  const emailVerificationCode = generateVerificationCode();
  const emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  user.emailVerificationToken = emailVerificationCode;
  user.emailVerificationExpiresAt = emailVerificationExpiresAt;
  await user.save();

  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    code: emailVerificationCode,
  });

  return {
    message: 'A new verification email has been sent.',
  };
}

async function confirmEmail({ token, code, email }) {
  const verificationValue = String(code || token || '').trim();

  if (!verificationValue) {
    throw createAuthError(400, 'Verification code is required.');
  }

  const match = {
    emailVerificationToken: verificationValue,
    emailVerificationExpiresAt: { $gt: Date.now() },
  };

  if (email) {
    match.email = normalizeEmail(email);
  }

  const user = await User.findOne(match).select('+emailVerificationToken +emailVerificationExpiresAt');

  if (!user) {
    throw createAuthError(400, 'This verification code is invalid or expired.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  return {
    message: 'Email verified successfully.',
    user: buildUserPayload(user),
  };
}

module.exports = {
  registerUser,
  loginUser,
  resendConfirmationEmail,
  confirmEmail,
  normalizeEmail,
  signToken,
};
