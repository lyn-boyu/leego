# 🚀 LeeGo - Level Up Your LeetCode Game! 🚀

[中文](./README.zh-CN.md)

A powerful command-line tool that lets you manage your LeetCode practice progress within your local IDE, featuring built-in spaced repetition learning, progress tracking, and Git integration. Additionally, it integrates a large language model (LLM) to boost your practice efficiency by automatically generating solutions, debugging test cases, and visualizing your weak areas.

## Features
![Progress Tracking](https://github.com/user-attachments/assets/b64e514b-d61d-4e93-868a-7f0cfd0b0701)

- 🎯 **Problem Management**
  - Add new problems with auto-generated templates
  - Submit solutions with comprehensive metadata
  - Track practice history and performance
  - Auto-archive previous solutions

- 📊 **Progress Tracking**
  - Visual practice heatmap
  - Learning streaks
  - Weekly goals
  - Practice statistics click [here](https://github.com/lyn-boyu/leego/wiki/Leego-Statistics-Page-Overview) to view the statistics page introduction

- 🧠 **Spaced Repetition**
  - Smart review scheduling based on the Ebbinghaus Forgetting Curve
  - Review reminders for optimal learning
  - Retention rate tracking
  - Customized review intervals: 1, 3, 7, 14, 30, 90, 180 days

- 🔄 **Git Integration**
  - Automatic commits with detailed metadata
  - Structured commit messages
  - Practice history preservation

- 🤖 **AI Integration**
  - Multiple AI providers supported:
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - DeepSeek
  - Smart solution templates
  - Test case generation
  - Code analysis

## Installation

### Prerequisites

Before installing leego, you need to have Bun.js installed on your system:

```bash
# For macOS, Linux, and WSL
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

For more installation options and troubleshooting, visit [bun.sh](https://bun.sh).

### Install leego
```bash
npm install -g leego
```

## Quick Start

1. Set up your workspace:
```bash
# Initialize the workspace
leego setup

# Configure LeetCode authentication
leego set-cookies

# Set AI provider (optional)
leego set-ai-key
```

2. Start practicing:
```bash
# Add a new problem
leego add

# Start practicing a problem
leego start <problem-number>

# Submit your solution
leego submit <problem-number>
```

3. Track your progress:
```bash
# View practice statistics
leego stats

# Set weekly goals
leego set-goals
```

## Authentication

### Setting Up Cookies (Recommended Method)

1. Open Chrome/Edge and go to [leetcode.com](https://leetcode.com)
2. Log in to your LeetCode account
3. Open DevTools:
   - Press `F12` or
   - Right-click anywhere and select "Inspect"
4. In DevTools:
   - Select the "Network" tab
   - Check "XHR" filter
   - Click any button on leetcode.com (e.g., click your profile)
5. In the Network panel:
   - Click any request to leetcode.com
   - In the request details, find "Headers" tab
   - Scroll to find "Cookie:" under "Request Headers"
   - Copy the entire cookie string (starts with `cf_clearance=` or `__cfduid=` and ends with `_gat=1`)

![Cookie Location](https://github.com/user-attachments/assets/25c5b040-806d-4d7b-a814-6fd319732677)

6. Set the cookies in leego:
```bash
leego set-cookies
```

7. Paste the copied cookie string when prompted

The tool will verify the cookies work before saving them.

## Commands

### Problem Management

- `leetgo search <title>`
  - Search problems by title
  - Shows problem number, title, and difficulty
  - Indicates premium (locked) problems
  - Case-insensitive search

- `leego add [problem-number]`
  - Add a new LeetCode problem
  - Auto-generates solution template and test files
  - Organizes problems by type
  - Uses AI for template generation (if configured)

- `leego start <problem-number>`
  - Start practicing a problem
  - Initializes test environment
  - Archives previous attempts
  - Starts test watch mode

- `leego submit <problem-number>`
  - Submit your solution
  - Runs tests
  - Records practice metadata
  - Updates learning progress
  - Creates Git commit

### Progress Tracking

- `leego stats`
  - Opens statistics dashboard in browser
  - Shows practice heatmap
  - Displays learning progress
  - Shows review schedule

- `leego set-goals`
  - Set weekly practice goals
  - Track completion rate
  - View historical performance

- 🤖 **Large Language Model Support**
  - Multiple LLM providers:
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - DeepSeek
    - Custom LLM implementations:
      - Local models (e.g., llama.cpp, ggml)
      - Self-hosted services
      - Alternative providers
      - Custom API endpoints
  - Intelligent code generation:
    - Solution templates
    - Test cases
    - Code analysis
    - Complexity analysis


#### Custom LLM Integration

You can integrate your own LLM implementation by:

1. Creating `.leetcode/llm.ts` in your workspace
2. Implementing the `generateWithAI` function:

```typescript
export async function generateWithAI(prompt: string): Promise<string> {
  try {
    // Implement your custom LLM logic here
    // Examples:
    // - Call local models (llama.cpp, ggml)
    // - Use self-hosted services
    // - Connect to alternative AI providers
    // - Call custom API endpoints
    return 'Generated response';
  } catch (error) {
    throw new Error(`Custom LLM error: ${error.message}`);
  }
}
```


## Project Structure

```
workspace/
├── 01-arrays-hashing/     # Problem categories
├── 02-two-pointers/
├── 03-sliding-window/
├── ...
└── problem-folder/
    ├── index.ts           # Solution implementation
    ├── index.test.ts      # Test cases
    ├── README.md          # Problem description
    └── .meta/
        ├── metadata.json  # Practice metadata
        ├── template.ts    # Original template
        └── archives/      # Previous solutions
```

## Metadata Tracking

The tool tracks comprehensive metadata for each problem:

- Practice history
- Time spent
- Approach used
- Complexity analysis
- Test results
- Review schedule
- Retention rates

## Git Integration

Automatic commits include:

```
solve(0011M): Container With Most Water [Medium]

Status: passed
Time Spent: 30m
Approach: Two Pointers
Time Complexity: O(n)
Space Complexity: O(1)
Timestamp: 24-01-27 15:30:45
```

## Spaced Repetition System

The tool implements a spaced repetition system based on the Ebbinghaus Forgetting Curve:

- Review intervals: 1, 3, 7, 14, 30, 90, 180 days
- Retention rate calculation based on:
  - Time since last review
  - Number of practice attempts
  - Problem difficulty
- Smart scheduling based on performance
- Visual retention indicators

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
