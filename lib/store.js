'use strict';

// A small JSON-file data store for customer accounts, sessions, and orders.
// It keeps everything in memory and writes the whole file atomically after
// each change — plenty for a boutique's volume, and no database to run.
// On hosts with ephemeral disks, point DATA_DIR at a persistent volume.

const fs = require('fs');
const path = require('path');

const EMPTY = () => ({ users: [], sessions: {}, resets: {}, orders: [] });

function createStore(dir) {
  const file = path.join(dir, 'store.json');
  let db = EMPTY();

  try {
    db = Object.assign(EMPTY(), JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  function save() {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, file);
  }

  function prune() {
    const now = Date.now();
    let changed = false;
    for (const table of ['sessions', 'resets']) {
      for (const [key, rec] of Object.entries(db[table])) {
        if (rec.expires < now) { delete db[table][key]; changed = true; }
      }
    }
    return changed;
  }

  if (prune()) save();

  return {
    // users
    findUserByEmail: (email) => db.users.find((u) => u.email === email) || null,
    findUserById: (id) => db.users.find((u) => u.id === id) || null,
    addUser(user) { db.users.push(user); save(); return user; },
    updateUser(id, fields) {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, fields, { updatedAt: new Date().toISOString() });
      save();
      return u;
    },
    deleteUser(id) {
      db.users = db.users.filter((u) => u.id !== id);
      for (const [k, s] of Object.entries(db.sessions)) if (s.userId === id) delete db.sessions[k];
      for (const [k, r] of Object.entries(db.resets)) if (r.userId === id) delete db.resets[k];
      // Keep order records for accounting, but detach them from the account.
      db.orders.forEach((o) => { if (o.userId === id) o.userId = null; });
      save();
    },

    // sessions (keyed by a hash of the token, never the token itself)
    getSession(hash) {
      const s = db.sessions[hash];
      if (!s) return null;
      if (s.expires < Date.now()) { delete db.sessions[hash]; save(); return null; }
      return s;
    },
    addSession(hash, rec) { prune(); db.sessions[hash] = rec; save(); },
    deleteSession(hash) { if (db.sessions[hash]) { delete db.sessions[hash]; save(); } },
    deleteUserSessions(userId, exceptHash) {
      for (const [k, s] of Object.entries(db.sessions)) if (s.userId === userId && k !== exceptHash) delete db.sessions[k];
      save();
    },

    // password reset tokens
    addReset(hash, rec) { prune(); db.resets[hash] = rec; save(); },
    takeReset(hash) {
      const r = db.resets[hash];
      if (!r) return null;
      delete db.resets[hash];
      save();
      return r.expires < Date.now() ? null : r;
    },

    // orders
    upsertOrder(order) {
      const i = db.orders.findIndex((o) => o.id === order.id);
      if (i === -1) db.orders.push(order);
      else db.orders[i] = Object.assign(db.orders[i], order, { userId: db.orders[i].userId || order.userId });
      save();
    },
    hasOrder: (id) => db.orders.some((o) => o.id === id),
    ordersForUser: (userId) => db.orders.filter((o) => o.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
}

module.exports = { createStore };
