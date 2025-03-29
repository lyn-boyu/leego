import { readFile } from 'fs/promises';
import path from 'path';
import { router, json, html, asset } from './router';
import { getStats } from './controllers/stats.controller';
import { getReviews } from './controllers/reviews.controller';
import {
  addStudyItem,
  updateStudyItem,
  deleteStudyItem,
  updateDailyGoal,
  getDailyGoal,
  updateCategoryOrders
} from './controllers/plan.controller';
import { searchProblems, getProblemTypes, detectProblemType } from './controllers/leetcode.controller';
import { getLearningPlan } from '../utils/plan';

// Update public directory path
const publicDir = path.join(__dirname, '../..', 'public');

// API Routes
router.add(/^\/api\/stats$/, {
  GET: async () => json(await getStats())
});

router.add(/^\/api\/reviews$/, {
  GET: async () => json(await getReviews())
});

router.add(/^\/api\/plan$/, {
  GET: async () => json(await getLearningPlan()),
  POST: async (req) => json(await addStudyItem(await req.json()))
});

// Daily Goal Routes - More specific route first
router.add(/^\/api\/plan\/daily-goal$/, {
  GET: async () => json({ goal: await getDailyGoal() }),
  PUT: async (req) => {
    const { goal } = await req.json();
    if (typeof goal !== 'number' || goal < 1) {
      return json({ error: 'Invalid goal value' }, 400);
    }
    return json(await updateDailyGoal(goal));
  }
});

// Category Orders Route - More specific route second
router.add(/^\/api\/plan\/category-orders$/, {
  PUT: async (req) => {
    const orders = await req.json();
    if (!orders || typeof orders !== 'object') {
      return json({ error: 'Invalid category orders' }, 400);
    }
    // Validate all values are numbers
    for (const order of Object.values(orders)) {
      if (typeof order !== 'number') {
        return json({ error: 'All orders must be numbers' }, 400);
      }
    }
    return json(await updateCategoryOrders(orders));
  }
});

// Generic item routes - Less specific route last
router.add(/^\/api\/plan\/item\/(?<id>[^/]+)$/, {
  PUT: async (req, params) => json(await updateStudyItem(params!.id, await req.json())),
  DELETE: async (req, params) => json(await deleteStudyItem(params!.id))
});

// LeetCode API Routes
router.add(/^\/api\/leetcode\/search$/, {
  GET: async (req) => {
    const url = new URL(req.url);
    const keyword = url.searchParams.get('keyword');
    if (!keyword) {
      return json({ error: 'Keyword is required' }, 400);
    }
    return json(await searchProblems(keyword));
  }
});

router.add(/^\/api\/leetcode\/problem-types$/, {
  GET: async () => json(await getProblemTypes())
});

router.add(/^\/api\/leetcode\/detect-type\/(?<number>\d+)$/, {
  GET: async (req, params) => {
    if (!params?.number) {
      return json({ error: 'Problem number is required' }, 400);
    }
    return json({ type: await detectProblemType(params.number) });
  }
});

// Static file routes
router.setSpaFallback(async () => html(await readFile(path.join(publicDir, 'index.html'), 'utf8')))

router.add(/^\/(index\.html)?$/, {
  GET: async () => html(await readFile(path.join(publicDir, 'index.html'), 'utf8'))
});

router.add(/^\/assets\/(.+)$/, {
  GET: async (req) => {
    const url = new URL(req.url);
    const content = await readFile(path.join(publicDir, url.pathname));
    const type = url.pathname.endsWith('.css') ? 'text/css' :
      url.pathname.endsWith('.js') ? 'application/javascript' :
        'application/octet-stream';
    return asset(content, type);
  }
});

export { router };