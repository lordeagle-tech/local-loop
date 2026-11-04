
## GitHub Pages deployment

Every push to `main` runs the GitHub Actions workflow in `.github/workflows/deploy-pages.yml`. The workflow packages the three static site files and deploys them to GitHub Pages without a build step. It can also be started manually from the repository's Actions tab.
