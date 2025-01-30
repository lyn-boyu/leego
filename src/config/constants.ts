// Project-specific paths relative to workspace
export const PROJECT_PATHS = {
  root: '.leetcode',                        // Root directory
  config: '.leetcode/config.json',          // Configuration file
  credentials: '.leetcode/credentials.json', // Sensitive information file
  problems: '.leetcode/problems.json',      // Problem cache file
  logs: '.leetcode/logs'                    // Log directory
} as const;

// Problem types and their corresponding directory names
export const PROBLEM_TYPES = [
  '01-arrays-hashing',
  '02-two-pointers',
  '03-sliding-window',
  '04-stack',
  '05-binary-search',
  '06-linked-list',
  '07-trees',
  '08-tries',
  '09-heap-priority-queue',
  '10-backtracking',
  '11-graphs',
  '12-advanced-graphs',
  '13-dynamic-programming-1d',
  '14-dynamic-programming-2d',
  '15-greedy',
  '16-intervals',
  '17-math-geometry',
  '18-bit-manipulation'
] as const;

// Mapping of LeetCode tags to our problem types
export const TAG_TO_TYPE_MAP: Record<string, string> = {
  'array': '01-arrays-hashing',
  'hash table': '01-arrays-hashing',
  'string': '01-arrays-hashing',
  'two pointers': '02-two-pointers',
  'sliding window': '03-sliding-window',
  'stack': '04-stack',
  'monotonic stack': '04-stack',
  'binary search': '05-binary-search',
  'linked list': '06-linked-list',
  'tree': '07-trees',
  'binary tree': '07-trees',
  'binary search tree': '07-trees',
  'trie': '08-tries',
  'heap (priority queue)': '09-heap-priority-queue',
  'heap': '09-heap-priority-queue',
  'backtracking': '10-backtracking',
  'graph': '11-graphs',
  'depth-first search': '11-graphs',
  'breadth-first search': '11-graphs',
  'union find': '12-advanced-graphs',
  'shortest path': '12-advanced-graphs',
  'dynamic programming': '13-dynamic-programming-1d',
  'matrix': '14-dynamic-programming-2d',
  '2d dynamic programming': '14-dynamic-programming-2d',
  'greedy': '15-greedy',
  'interval': '16-intervals',
  'math': '17-math-geometry',
  'geometry': '17-math-geometry',
  'bit manipulation': '18-bit-manipulation'
};

// Language-specific file configurations
export const LANGUAGE_FILES = {
  typescript: {
    solutionFileName: 'index.ts',
    testFileName: 'index.test.ts',
    templateFileName: 'template.ts'
  },
  javascript: {
    solutionFileName: 'index.js',
    testFileName: 'index.test.js',
    templateFileName: 'template.js'
  }
} as const;

// AI Provider configurations
export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-coder-33b-instruct', name: 'DeepSeek Coder 33B' },
      { id: 'deepseek-coder-6.7b-instruct', name: 'DeepSeek Coder 6.7B' }
    ]
  }
} as const;

export type AIProvider = keyof typeof AI_PROVIDERS;
export type AIModel = string; // Allow any string for custom models

// AI Configuration type
export interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
}

// Base configuration type
export interface Config {
  language: keyof typeof LANGUAGE_FILES;
  githubRepo?: {
    owner: string;
    name: string;
  };
  learningProgress: {
    current_streak: {
      days: number;
      start_date: string;
      last_practice: string;
    };
    best_streak: {
      days: number;
      start_date: string;
      end_date: string;
    };
    total_days: number;
    total_problems: number;
  };
  weeklyProgress: {
    target: number;
    current: number;
    weekStart: string | null;
    problems: string[];  // Array of problem numbers completed this week
    history: Array<{
      weekStart: string;
      target: number;
      achieved: number;
      problems: string[];  // Array of problem numbers completed in that week
    }>;
  };
}

// Sensitive configuration type
export interface SensitiveConfig {
  cookies: string;
  ai: {
    activeKey: string | null;
    keys: Record<string, AIConfig>;
  };
}

// Default configuration values
export function getDefaultConfig(): Config {
  return {
    language: 'typescript',
    learningProgress: {
      current_streak: {
        days: 0,
        start_date: '',
        last_practice: ''
      },
      best_streak: {
        days: 0,
        start_date: '',
        end_date: ''
      },
      total_days: 0,
      total_problems: 0
    },
    weeklyProgress: {
      target: 7,
      current: 0,
      weekStart: null,
      problems: [],
      history: []
    }
  };
}

// Default sensitive configuration values
export function getDefaultSensitiveConfig(): SensitiveConfig {
  return {
    cookies: '',
    ai: {
      activeKey: null,
      keys: {}
    }
  };
}