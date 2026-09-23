'use strict';

// Customer accounts: sign up, sign in/out, profile, password change and reset,
// account deletion, and order history.

const crypto = require('crypto');
const express = require('express');

const SESSION_COOKIE = 'lkl_session';
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const normEmail = (v) => clean(v, 200).toLowerCase();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [, salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

// A throwaway hash so sign-in takes the same time whether or not the email exists.
const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone || '', createdAt: u.createdAt };
}

function createAccounts({ store, mailer, siteUrl }) {
  const secureCookie = siteUrl.startsWith('https://');
  const attempts = new Map();

  function limited(key, max, windowMs) {
    const now = Date.now();
    const hits = (attempts.get(key) || []).filter((t) => now - t < windowMs);
    hits.push(now);
    attempts.set(key, hits);
    return hits.length > max;
  }

  function setSessionCookie(res, token, maxAgeSec) {
    const parts = [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAgeSec}`,
    ];
    if (secureCookie) parts.push('Secure');
    res.append('Set-Cookie', parts.join('; '));
  }

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    store.addSession(sha256(token), { userId, expires: Date.now() + SESSION_DAYS * 864e5, createdAt: new Date().toISOString() });
    setSessionCookie(res, token, SESSION_DAYS * 86400);
  }

  // Attaches req.user (or null) to every request.
  function loadUser(req, res, next) {
    req.user = null;
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (token) {
      req.sessionHash = sha256(token);
      const s = store.getSession(req.sessionHash);
      if (s) req.user = store.findUserById(s.userId);
    }
    next();
  }

  function requireUser(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
    next();
  }

  // State-changing requests must be JSON. Browsers can't send a cross-site JSON
  // POST without a CORS preflight, which we never approve — this plus SameSite
  // cookies protects against cross-site request forgery.
  function jsonOnly(req, res, next) {
    if (req.method !== 'GET' && !req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported request.' });
    }
    next();
  }

  const router = express.Router();
  router.use(jsonOnly);

  router.get('/auth/me', (req, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null });
  });

  router.post('/auth/register', (req, res) => {
    const name = clean(req.body.name, 120);
    const email = normEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Your password must be at least ${MIN_PASSWORD} characters.` });
    if (password.length > 200) return res.status(400).json({ error: 'That password is too long.' });
    if (limited(`reg:${req.ip}`, 10, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    if (store.findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists. Try signing in instead.' });
    }
    const now = new Date().toISOString();
    const user = store.addUser({
      id: crypto.randomUUID(),
      name,
      email,
      phone: '',
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now,
    });
    startSession(res, user.id);
    res.status(201).json({ user: publicUser(user) });
  });

  router.post('/auth/login', (req, res) => {
    const email = normEmail(req.body.email);
    const password = String(req.body.password || '');
    if (limited(`login:${req.ip}`, 20, 15 * 60 * 1000) || limited(`login:${email}`, 8, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a few minutes and try again.' });
    }
    const user = store.findUserByEmail(email);
    const ok = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'That email and password don’t match our records.' });
    startSession(res, user.id);
    res.json({ user: publicUser(user) });
  });

  router.post('/auth/logout', (req, res) => {
    if (req.sessionHash) store.deleteSession(req.sessionHash);
    setSessionCookie(res, '', 0);
    res.json({ ok: true });
  });

  router.post('/auth/forgot', async (req, res) => {
    const email = normEmail(req.body.email);
    const generic = { ok: true, message: 'If an account exists for that email, we’ve sent a link to reset your password.' };
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (limited(`forgot:${req.ip}`, 5, 60 * 60 * 1000) || limited(`forgot:${email}`, 3, 60 * 60 * 1000)) return res.json(generic);
    const user = store.findUserByEmail(email);
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('base64url');
    store.addReset(sha256(token), { userId: user.id, expires: Date.now() + RESET_MINUTES * 60 * 1000 });
    const link = `${siteUrl}/reset-password.html?token=${token}`;
    const text = `Hello ${user.name},\n\nWe received a request to reset the password for your Lady Katt Luxe account. ` +
      `Use the link below within ${RESET_MINUTES} minutes to choose a new password:\n\n${link}\n\n` +
      `If you didn’t ask for this, you can ignore this email — your password won’t change.\n\nLady Katt Luxe LLC\ncontact@ladykattluxe.shop · 904-663-2417`;
    try {
      if (mailer) {
        await mailer.sendMail({
          from: process.env.CONTACT_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'Reset your Lady Katt Luxe password',
          text,
        });
      } else {
        console.log(`[password reset] Email is not configured. Reset link for ${user.email}: ${link}`);
      }
    } catch (err) {
      console.error('Password reset email error:', err.message);
    }
    res.json(generic);
  });

  router.post('/auth/reset', (req, res) => {
    const token = clean(req.body.token, 200);
    const password = String(req.body.password || '');
    if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Your password must be at least ${MIN_PASSWORD} characters.` });
    if (password.length > 200) return res.status(400).json({ error: 'That password is too long.' });
    const reset = token ? store.takeReset(sha256(token)) : null;
    const user = reset && store.findUserById(reset.userId);
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
    store.updateUser(user.id, { passwordHash: hashPassword(password) });
    store.deleteUserSessions(user.id);
    startSession(res, user.id);
    res.json({ user: publicUser(user) });
  });

  router.patch('/account', requireUser, (req, res) => {
    const name = clean(req.body.name, 120);
    const phone = clean(req.body.phone, 40);
    if (!name) return res.status(400).json({ error: 'Please enter your name.' });
    const user = store.updateUser(req.user.id, { name, phone });
    res.json({ user: publicUser(user) });
  });

  router.post('/account/password', requireUser, (req, res) => {
    const current = String(req.body.currentPassword || '');
    const next = String(req.body.newPassword || '');
    if (limited(`pw:${req.user.id}`, 8, 15 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    if (!verifyPassword(current, req.user.passwordHash)) return res.status(400).json({ error: 'Your current password is incorrect.' });
    if (next.length < MIN_PASSWORD) return res.status(400).json({ error: `Your new password must be at least ${MIN_PASSWORD} characters.` });
    if (next.length > 200) return res.status(400).json({ error: 'That password is too long.' });
    store.updateUser(req.user.id, { passwordHash: hashPassword(next) });
    store.deleteUserSessions(req.user.id, req.sessionHash); // sign out other devices
    res.json({ ok: true });
  });

  router.post('/account/delete', requireUser, (req, res) => {
    if (!verifyPassword(String(req.body.password || ''), req.user.passwordHash)) {
      return res.status(400).json({ error: 'Your password is incorrect.' });
    }
    store.deleteUser(req.user.id);
    setSessionCookie(res, '', 0);
    res.json({ ok: true });
  });

  router.get('/account/orders', requireUser, (req, res) => {
    res.json({ orders: store.ordersForUser(req.user.id) });
  });

  return { router, loadUser };
}

module.exports = { createAccounts };
