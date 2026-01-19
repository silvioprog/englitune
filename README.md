# Englitune

[![Unit Tests](https://github.com/silvioprog/englitune/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/silvioprog/englitune/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/silvioprog/englitune/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/silvioprog/englitune/actions/workflows/e2e-tests.yml)
[![SSL Labs A+](https://img.shields.io/badge/SSL%20Labs-A%2B-brightgreen)](https://www.ssllabs.com/ssltest/analyze.html?d=englitune.silvioprog.dev)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-100%25-brightgreen)](https://pagespeed.web.dev/analysis?url=https://englitune.silvioprog.dev)
[![Mozilla HTTP Observatory](https://img.shields.io/badge/Mozilla%20HTTP%20Observatory-A%2B-brightgreen)](https://observatory.mozilla.org/analyze/englitune.silvioprog.dev)

Your personalized English learning companion that helps you master the language through spaced repetition and audio-based practice.

## Features

- 🎧 Listen to audio clips in English
- ✅ Mark whether you understood or not
- ⏰ Review items at optimal intervals for better retention using a hybrid spaced repetition system
- 📊 Track your progress as you master new content
- 🎯 Access to +44k audio clips for review and practice

## How Spaced Repetition Works

Englitune uses a fixed-interval spaced repetition system that adapts to your learning progress. The system follows a hybrid approach that starts with short intervals and gradually extends to longer ones, based on the [forgetting curve](https://en.wikipedia.org/wiki/Forgetting_curve) principle:

**Learning Phase:**

- **1 minute** - Immediate reinforcement after first exposure
- **10 minutes** - Short-term reinforcement
- **1 hour** - Medium-term retention
- **4 hours** - Extended short-term consolidation

**Review Phase:**

- **1 day** - Daily review
- **3 days** - Multi-day interval
- **7 days** - Weekly review
- **14 days** - Bi-weekly review
- **30 days** - Monthly review (mastered)

Items you understand advance to longer intervals, while items you struggle with reset to earlier steps for more practice. This approach is inspired by established spaced repetition methodologies like [Anki](<https://en.wikipedia.org/wiki/Anki_(software)>) and [SuperMemo](https://en.wikipedia.org/wiki/SuperMemo), using a simplified fixed-interval system rather than their more complex adaptive algorithms.

For more information on spaced repetition, see the [Wikipedia article on spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition).

## Tech Stack

- React 19 + TypeScript
- Vite
- TanStack Query
- Tailwind CSS
- Radix UI
- Cloudflare Workers (deployment)
- PWA support

## Getting Started

**Prerequisites:** Node.js >=24 (or use `nvm use` if you have nvm)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run coverage` - Run unit tests with coverage
- `npm run e2e` - Run E2E tests

## License

See [LICENSE](LICENSE) file for details.
