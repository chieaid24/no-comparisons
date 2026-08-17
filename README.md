# no-comparisons

no-comparisons reduces distracting social-comparison signals on GitHub and LinkedIn.

The extension:

- Hides GitHub contribution graphs, activity, and year navigation.
- Blocks your GitHub Overview and Followers while leaving Following available.
- Uses redirect-only blocking for other individual GitHub profiles, leaving user links and user interface elements visible.
- Blocks the LinkedIn home feed.
- Uses redirect-only blocking for other LinkedIn profiles, leaving user links and user interface elements visible.
- Provides six independent toggles through the extension popup.

Repositories, organizations, issues, pull requests, jobs, messaging, notifications, settings, and other application pages remain accessible. The extension makes no network requests.

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the repository folder.

## Configuration

Set `githubUsername` and `linkedinProfileSlug` in `config.js` before loading the extension for another account. Click the extension icon to change blockers; popup settings persist across browser restarts.
