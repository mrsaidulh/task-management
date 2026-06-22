import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { TEAM_MEMBERS, DEFAULT_PROJECTS, DEFAULT_RULES, PRESET_TEMPLATES } from './src/data.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// --- Initial Backlog Seed Tasks ---
const INITIAL_TASKS = [
  {
    id: 'task_1',
    title: 'Design Mobile Nav Drawer Refactor',
    description: 'Create a clean slide-out menu layout for mobile sizing. Ensure targets are at least 44px to comply with accessibility standards.',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    assigneeId: 'user_elena',
    tags: ['UI-Design', 'Mobile'],
    checklist: [
      { id: 'c1', text: 'Define screen breakpoints', completed: true },
      { id: 'c2', text: 'Design dark/light preview rules', completed: false },
      { id: 'c3', text: 'Deliver asset exports in Figma', completed: false }
    ],
    projectId: 'proj_titan',
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 24 * 60 * 60 * 1000,
    order: 0
  },
  {
    id: 'task_2',
    title: 'Fix Real-Time Websocket Reconnection Bug',
    description: 'HMR and network loss disrupts the active stream payload. Introduce linear exponential backoff logic for retry attempts.',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    assigneeId: 'user_david',
    tags: ['Backend', 'WebSockets'],
    checklist: [
      { id: 'c4', text: 'Diagnose socket pooling issue', completed: true },
      { id: 'c5', text: 'Implement retry state machine', completed: false }
    ],
    projectId: 'proj_titan',
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    order: 1000
  },
  {
    id: 'task_3',
    title: 'Publish Launch Announcement & Product Docs',
    description: 'Prepare and push public release notice. Highlight standard agile board drag-and-drop and the automated custom workflows.',
    status: 'review',
    priority: 'low',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    assigneeId: 'user_sarah',
    tags: ['Marketing', 'Product'],
    checklist: [
      { id: 'c6', text: 'Draft draft press brief', completed: false },
      { id: 'c7', text: 'Verify dev environment features list', completed: true }
    ],
    projectId: 'proj_titan',
    createdAt: Date.now() - 8 * 60 * 60 * 1000,
    updatedAt: Date.now(),
    order: 2000
  }
];

// --- In-Memory Fallback Engine ---
let mem_tasks = [...INITIAL_TASKS];
let mem_projects = [...DEFAULT_PROJECTS];
let mem_users = [...TEAM_MEMBERS];
let mem_rules = [...DEFAULT_RULES];
let mem_logs: any[] = [
  {
    id: 'log_init',
    userId: 'system',
    userName: 'Platform Bot',
    action: 'Initialized full-stack collaborative work engine.',
    createdAt: Date.now()
  }
];
let mem_comments: any[] = [];
let mem_messages: any[] = [];
let mem_templates = [...PRESET_TEMPLATES];
let mem_presenceMap: Record<string, number> = {};

// --- MySQL Database Configuration & Pool ---
let mysqlPool: mysql.Pool | null = null;
let useMySQL = false;

async function bootstrapMySQL() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'workmanager';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  if (!host || !user) {
    console.warn('[Database] MySQL environment variables not fully set (DB_HOST and DB_USER are required). Falling back to direct in-memory storage.');
    return;
  }

  try {
    console.log(`[Database] Attempting connection to MySQL server at ${host}:${port}...`);
    
    // Step 1: Create a temporary connection without database selected to ensure DB exists
    const tempConnection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      connectTimeout: 5000
    });

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await tempConnection.end();

    // Step 2: Establish connection pool with selected database
    mysqlPool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      keepAliveInitialDelay: 10000,
      enableKeepAlive: true,
      connectionLimit: 10
    });

    useMySQL = true;
    console.log(`[Database] Successfully connected to MySQL database: "${database}"`);

    // Step 3: Run table migrations
    await runMigrations();

  } catch (err: any) {
    console.error(`[Database] Connection to MySQL failed: ${err.message}. Running fallback mode.`);
    useMySQL = false;
    mysqlPool = null;
  }
}

async function runMigrations() {
  if (!mysqlPool) return;

  console.log('[Database] Checking schemas & migrating tables...');

  // 1. Users Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      avatarColor VARCHAR(255) NOT NULL,
      avatarText VARCHAR(50) NOT NULL,
      isOwner BOOLEAN DEFAULT FALSE,
      password VARCHAR(255) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Projects Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      color VARCHAR(255) NOT NULL,
      memberRoles JSON NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Tasks Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      status VARCHAR(100) NOT NULL,
      priority VARCHAR(50) NOT NULL,
      dueDate VARCHAR(50) NULL,
      startDate VARCHAR(50) NULL,
      assigneeId VARCHAR(255) NOT NULL,
      tags JSON NULL,
      checklist JSON NULL,
      projectId VARCHAR(255) NOT NULL,
      createdAt BIGINT NOT NULL,
      updatedAt BIGINT NOT NULL,
      completedAt BIGINT NULL,
      dependencies JSON NULL,
      order_val DOUBLE NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Workflow Rules Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS workflowRules (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      triggerType VARCHAR(100) NOT NULL,
      triggerValue VARCHAR(255) NOT NULL,
      actionType VARCHAR(100) NOT NULL,
      actionValue VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Comments Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(255) PRIMARY KEY,
      taskId VARCHAR(255) NOT NULL,
      senderId VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      createdAt BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Messages Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(255) PRIMARY KEY,
      channelId VARCHAR(255) NOT NULL,
      senderId VARCHAR(255) NOT NULL,
      text TEXT NOT NULL,
      createdAt BIGINT NOT NULL,
      taskId VARCHAR(255) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Activity Logs Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS activityLogs (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      userName VARCHAR(255) NOT NULL,
      action TEXT NOT NULL,
      taskId VARCHAR(255) NULL,
      taskTitle VARCHAR(255) NULL,
      createdAt BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Project Templates Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS projectTemplates (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      color VARCHAR(255) NOT NULL,
      tasks JSON NOT NULL,
      isCustom BOOLEAN DEFAULT FALSE,
      createdBy VARCHAR(255) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Presence Heartbeats Table
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS presence (
      userId VARCHAR(255) PRIMARY KEY,
      lastActive BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seeding initial records if empty
  await seedStaticDataIfEmpty();
}

async function seedStaticDataIfEmpty() {
  if (!mysqlPool) return;

  try {
    // Audit Users
    const [userRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('[Schema Seed] Seeding default members to users table...');
      for (const m of TEAM_MEMBERS) {
        await mysqlPool.query(
          'INSERT INTO users (id, name, role, email, avatarColor, avatarText, isOwner, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [m.id, m.name, m.role, m.email, m.avatarColor, m.avatarText, m.isOwner ? 1 : 0, m.password || null]
        );
      }
    }

    // Audit Projects
    const [projectRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM projects');
    if (projectRows[0].count === 0) {
      console.log('[Schema Seed] Seeding default projects...');
      for (const p of DEFAULT_PROJECTS) {
        await mysqlPool.query(
          'INSERT INTO projects (id, name, description, color, memberRoles) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.name, p.description, p.color, JSON.stringify(p.memberRoles || {})]
        );
      }
    }

    // Audit Tasks
    const [taskRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM tasks');
    if (taskRows[0].count === 0) {
      console.log('[Schema Seed] Seeding demo tasks...');
      for (const t of INITIAL_TASKS) {
        await mysqlPool.query(
          'INSERT INTO tasks (id, title, description, status, priority, dueDate, startDate, assigneeId, tags, checklist, projectId, createdAt, updatedAt, completedAt, dependencies, order_val) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            t.id, 
            t.title, 
            t.description, 
            t.status, 
            t.priority, 
            t.dueDate, 
            t.startDate || null, 
            t.assigneeId, 
            JSON.stringify(t.tags), 
            JSON.stringify(t.checklist), 
            t.projectId, 
            t.createdAt, 
            t.updatedAt, 
            null, 
            JSON.stringify([]), 
            t.order
          ]
        );
      }
    }

    // Audit Workflow Rules
    const [ruleRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM workflowRules');
    if (ruleRows[0].count === 0) {
      console.log('[Schema Seed] Seeding default workflow rules...');
      for (const r of DEFAULT_RULES) {
        await mysqlPool.query(
          'INSERT INTO workflowRules (id, name, active, triggerType, triggerValue, actionType, actionValue) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.name, r.active ? 1 : 0, r.triggerType, r.triggerValue, r.actionType, r.actionValue]
        );
      }
    }

    // Audit Project Templates
    const [templateRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM projectTemplates');
    if (templateRows[0].count === 0) {
      console.log('[Schema Seed] Seeding preset project templates...');
      for (const t of PRESET_TEMPLATES) {
        await mysqlPool.query(
          'INSERT INTO projectTemplates (id, name, description, color, tasks, isCustom, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.name, t.description, t.color, JSON.stringify(t.tasks), t.isCustom ? 1 : 0, t.createdBy || null]
        );
      }
    }

    console.log('[Schema Seed] MySQL schema check complete.');
  } catch (error) {
    console.error('[Schema Seed] Failed checking or seeding tables in MySQL:', error);
  }
}

// 🚀 Start Bootstrapping MySQL Database in parallel background (now deferred to startServer function)


// -------------------------------------------------------------
// ------------------- REST CONTROLLERS / API -------------------
// -------------------------------------------------------------

// --- 1. USER PROFILES ---
app.get('/api/users', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM users');
      const formatted = rows.map((u: any) => ({
        ...u,
        isOwner: !!u.isOwner
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_users);
  }
});

app.post('/api/users', async (req, res) => {
  const profile = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO users (id, name, role, email, avatarColor, avatarText, isOwner, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [profile.id, profile.name, profile.role, profile.email, profile.avatarColor, profile.avatarText, profile.isOwner ? 1 : 0, profile.password || null]
      );
      return res.json(profile);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_users.push(profile);
    return res.json(profile);
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (useMySQL && mysqlPool) {
    try {
      // Create dynamically matching keys
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.json({ id });
      
      const assignments = keys.map(k => {
        if (k === 'isOwner') return `isOwner = ?`;
        return `\`${k}\` = ?`;
      }).join(', ');

      const values = keys.map(k => k === 'isOwner' ? (updates[k] ? 1 : 0) : updates[k]);
      values.push(id);

      await mysqlPool.query(`UPDATE users SET ${assignments} WHERE id = ?`, values);
      return res.json({ id, ...updates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_users = mem_users.map(u => u.id === id ? { ...u, ...updates } : u);
    return res.json({ id, ...updates });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_users = mem_users.filter(u => u.id !== id);
    return res.json({ success: true });
  }
});


// --- 2. PROJECTS ---
app.get('/api/projects', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM projects');
      const formatted = rows.map((p: any) => ({
        ...p,
        memberRoles: typeof p.memberRoles === 'string' ? JSON.parse(p.memberRoles) : (p.memberRoles || {})
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_projects);
  }
});

app.post('/api/projects', async (req, res) => {
  const proj = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO projects (id, name, description, color, memberRoles) VALUES (?, ?, ?, ?, ?)',
        [proj.id, proj.name, proj.description, proj.color, JSON.stringify(proj.memberRoles || {})]
      );
      return res.json(proj);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_projects.push(proj);
    return res.json(proj);
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (useMySQL && mysqlPool) {
    try {
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.json({ id });

      const assignments = keys.map(k => `\`${k}\` = ?`).join(', ');
      const values = keys.map(k => k === 'memberRoles' ? JSON.stringify(updates[k]) : updates[k]);
      values.push(id);

      await mysqlPool.query(`UPDATE projects SET ${assignments} WHERE id = ?`, values);
      return res.json({ id, ...updates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_projects = mem_projects.map(p => p.id === id ? { ...p, ...updates } : p);
    return res.json({ id, ...updates });
  }
});


// --- 3. TASKS ---
app.get('/api/tasks', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM tasks ORDER BY createdAt DESC');
      const formatted = rows.map((t: any) => ({
        ...t,
        tags: typeof t.tags === 'string' ? JSON.parse(t.tags) : (t.tags || []),
        checklist: typeof t.checklist === 'string' ? JSON.parse(t.checklist) : (t.checklist || []),
        dependencies: typeof t.dependencies === 'string' ? JSON.parse(t.dependencies) : (t.dependencies || []),
        completedAt: t.completedAt ? Number(t.completedAt) : undefined,
        createdAt: Number(t.createdAt),
        updatedAt: Number(t.updatedAt),
        order: t.order_val !== null ? Number(t.order_val) : undefined
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_tasks);
  }
});

app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO tasks (id, title, description, status, priority, dueDate, startDate, assigneeId, tags, checklist, projectId, createdAt, updatedAt, completedAt, dependencies, order_val) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          task.id,
          task.title,
          task.description,
          task.status,
          task.priority,
          task.dueDate,
          task.startDate || null,
          task.assigneeId,
          JSON.stringify(task.tags || []),
          JSON.stringify(task.checklist || []),
          task.projectId,
          task.createdAt,
          task.updatedAt,
          task.completedAt || null,
          JSON.stringify(task.dependencies || []),
          task.order !== undefined ? task.order : null
        ]
      );
      return res.json(task);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_tasks.push(task);
    return res.json(task);
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (useMySQL && mysqlPool) {
    try {
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.json({ id });

      const assignments = keys.map(k => {
        if (k === 'order') return '`order_val` = ?';
        return `\`${k}\` = ?`;
      }).join(', ');

      const values = keys.map(k => {
        if (k === 'tags' || k === 'checklist' || k === 'dependencies') {
          return JSON.stringify(updates[k]);
        }
        return updates[k];
      });
      values.push(id);

      await mysqlPool.query(`UPDATE tasks SET ${assignments} WHERE id = ?`, values);
      return res.json({ id, ...updates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_tasks = mem_tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    return res.json({ id, ...updates });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM tasks WHERE id = ?', [id]);
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_tasks = mem_tasks.filter(t => t.id !== id);
    return res.json({ success: true });
  }
});


// --- 4. WORKFLOW RULES ---
app.get('/api/workflow-rules', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM workflowRules');
      const formatted = rows.map((r: any) => ({
        ...r,
        active: !!r.active
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_rules);
  }
});

app.post('/api/workflow-rules', async (req, res) => {
  const rule = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO workflowRules (id, name, active, triggerType, triggerValue, actionType, actionValue) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [rule.id, rule.name, rule.active ? 1 : 0, rule.triggerType, rule.triggerValue, rule.actionType, rule.actionValue]
      );
      return res.json(rule);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_rules.push(rule);
    return res.json(rule);
  }
});

app.put('/api/workflow-rules/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (useMySQL && mysqlPool) {
    try {
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.json({ id });

      const assignments = keys.map(k => `\`${k}\` = ?`).join(', ');
      const values = keys.map(k => k === 'active' ? (updates[k] ? 1 : 0) : updates[k]);
      values.push(id);

      await mysqlPool.query(`UPDATE workflowRules SET ${assignments} WHERE id = ?`, values);
      return res.json({ id, ...updates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_rules = mem_rules.map(r => r.id === id ? { ...r, ...updates } : r);
    return res.json({ id, ...updates });
  }
});


// --- 5. COMMENTS ---
app.get('/api/comments', async (req, res) => {
  const { taskId } = req.query;
  if (useMySQL && mysqlPool) {
    try {
      let qStr = 'SELECT * FROM comments';
      const vals: any[] = [];
      if (taskId) {
        qStr += ' WHERE taskId = ?';
        vals.push(taskId);
      }
      qStr += ' ORDER BY createdAt ASC';
      const [rows]: any = await mysqlPool.query(qStr, vals);
      const formatted = rows.map((c: any) => ({
        ...c,
        createdAt: Number(c.createdAt)
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    let pool = mem_comments;
    if (taskId) {
      pool = pool.filter(c => c.taskId === taskId);
    }
    return res.json(pool);
  }
});

app.post('/api/comments', async (req, res) => {
  const comment = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO comments (id, taskId, senderId, text, createdAt) VALUES (?, ?, ?, ?, ?)',
        [comment.id, comment.taskId, comment.senderId, comment.text, comment.createdAt]
      );
      return res.json(comment);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_comments.push(comment);
    return res.json(comment);
  }
});


// --- 6. MESSAGES ---
app.get('/api/messages', async (req, res) => {
  const { channelId } = req.query;
  if (useMySQL && mysqlPool) {
    try {
      let qStr = 'SELECT * FROM messages';
      const vals: any[] = [];
      if (channelId) {
        qStr += ' WHERE channelId = ?';
        vals.push(channelId);
      }
      qStr += ' ORDER BY createdAt ASC';
      const [rows]: any = await mysqlPool.query(qStr, vals);
      const formatted = rows.map((m: any) => ({
        ...m,
        createdAt: Number(m.createdAt)
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    let pool = mem_messages;
    if (channelId) {
      pool = pool.filter(m => m.channelId === channelId);
    }
    return res.json(pool);
  }
});

app.post('/api/messages', async (req, res) => {
  const msg = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO messages (id, channelId, senderId, text, createdAt, taskId) VALUES (?, ?, ?, ?, ?, ?)',
        [msg.id, msg.channelId, msg.senderId, msg.text, msg.createdAt, msg.taskId || null]
      );
      return res.json(msg);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_messages.push(msg);
    return res.json(msg);
  }
});


// --- 7. ACTIVITY LOGS ---
app.get('/api/activity-logs', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM activityLogs ORDER BY createdAt DESC');
      const formatted = rows.map((l: any) => ({
        ...l,
        createdAt: Number(l.createdAt)
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_logs);
  }
});

app.post('/api/activity-logs', async (req, res) => {
  const log = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO activityLogs (id, userId, userName, action, taskId, taskTitle, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [log.id, log.userId, log.userName, log.action, log.taskId || null, log.taskTitle || null, log.createdAt]
      );
      return res.json(log);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_logs.unshift(log);
    return res.json(log);
  }
});


// --- 8. PROJECT TEMPLATES ---
app.get('/api/project-templates', async (req, res) => {
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM projectTemplates');
      const formatted = rows.map((t: any) => ({
        ...t,
        tasks: typeof t.tasks === 'string' ? JSON.parse(t.tasks) : (t.tasks || []),
        isCustom: !!t.isCustom
      }));
      return res.json(formatted);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    return res.json(mem_templates);
  }
});

app.post('/api/project-templates', async (req, res) => {
  const tpl = req.body;
  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO projectTemplates (id, name, description, color, tasks, isCustom, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tpl.id, tpl.name, tpl.description, tpl.color, JSON.stringify(tpl.tasks || []), tpl.isCustom ? 1 : 0, tpl.createdBy || null]
      );
      return res.json(tpl);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_templates.push(tpl);
    return res.json(tpl);
  }
});


// --- 9. PRESENCE HEARTBEAT ---
app.get('/api/presence', async (req, res) => {
  const now = Date.now();
  if (useMySQL && mysqlPool) {
    try {
      const [rows]: any = await mysqlPool.query('SELECT * FROM presence');
      
      // return map of active online profile IDs in last 12 seconds
      const onlineMap: Record<string, boolean> = {};
      rows.forEach((p: any) => {
        if (now - Number(p.lastActive) < 12000) {
          onlineMap[p.userId] = true;
        }
      });
      return res.json(onlineMap);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    const onlineMap: Record<string, boolean> = {};
    Object.entries(mem_presenceMap).forEach(([userId, lastActive]) => {
      if (now - lastActive < 12000) {
        onlineMap[userId] = true;
      }
    });
    return res.json(onlineMap);
  }
});

app.post('/api/presence', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const now = Date.now();

  if (useMySQL && mysqlPool) {
    try {
      await mysqlPool.query(
        'INSERT INTO presence (userId, lastActive) VALUES (?, ?) ON DUPLICATE KEY UPDATE lastActive = ?',
        [userId, now, now]
      );
      return res.json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  } else {
    mem_presenceMap[userId] = now;
    return res.json({ success: true });
  }
});


// --- Health Endpoint ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', usingMySQL: useMySQL });
});


async function startServer() {
  await bootstrapMySQL();

  // -----------------------------------------------------------------
  // ----------------- VITE DEVELOPMENT & OUT-BUNDLING ---------------
  // -----------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Standard SPA callback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Ready at http://localhost:${PORT}`);
  });
}

startServer();
