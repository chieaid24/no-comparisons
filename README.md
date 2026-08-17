# No Contributions

No Contributions reduces distracting social-comparison signals on GitHub and LinkedIn.

The extension:

- Hides GitHub contribution graphs, activity, and year navigation.
- Redirects other individual GitHub profiles to `github.com/chieaid24`.
- Redirects the LinkedIn home feed to `linkedin.com/in/aidanchien`.
- Redirects other LinkedIn profiles and their subpages to `linkedin.com/in/aidanchien`.

Repositories, organizations, issues, pull requests, jobs, messaging, notifications, settings, and other application pages remain accessible. The extension stores no data and makes no network requests.

## Installation

1. Clone or download this repository.

   ```bash
   git clone https://github.com/chieaid24/no-contributions.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `no-contributions` folder.

## Configuration

Set `githubUsername` and `linkedinProfileSlug` in `config.js` before loading the extension for another account.
