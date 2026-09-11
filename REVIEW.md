# Code Review: P12 Benford Checker

This document contains a comprehensive code review of the `P12-benford-checker` repository. Findings are categorized by severity.

## 1. CRITICAL
*None found.* The application is entirely client-side with no sensitive data handling, API keys, or obvious remote execution vectors. Data privacy is maintained as all processing occurs locally.

## 2. HIGH

### 2.1 SPEC Regression: Missing Chi-Square Test & Small Sample Size Risk
- **Location:** `app.js` (Statistical logic and Demo Data)
- **Impact:** The current implementation uses an arbitrary L1 deviation threshold (0.15/0.25) which is not statistically sound for Benford's law. A Chi-square (χ²) test is the standard requirement. Furthermore, the UI lacks display of the χ² statistic, p-value (or significance level), and sample size (N). The built-in demo data only has ~50 rows, which is too small for reliable Benford analysis and presents an ethical risk of misleading investigative journalists into drawing conclusions from insufficient data.
- **Fix Suggestion:** Implement the Chi-square goodness-of-fit test. Display χ², degrees of freedom, and sample size N. Enforce or clearly warn if N < 100. Update the demo data to include at least 150-200 rows. Replace subjective "risk" language with objective statistical conclusions.

### 2.2 GBK/GB18030 Encoding Support Missing
- **Location:** `app.js` (`parseCsv` function)
- **Impact:** PapaParse defaults to UTF-8. Domestic (Chinese) CSVs often use GBK or GB18030 encoding (e.g., exported from local software or Excel). Without specifying the encoding, domestic users will see garbled text in headers and string columns, potentially breaking column inference and analysis.
- **Fix Suggestion:** Add an encoding selection dropdown (UTF-8 / GBK) to the UI and pass the selected encoding to PapaParse.

### 2.3 Main Thread Blocking for Large CSV Files
- **Location:** `app.js` (`parseCsv` function and `analyzeBtn.addEventListener`)
- **Impact:** PapaParse is configured to parse the entire file into memory at once. For large CSV files (e.g., >50MB with millions of rows), this will freeze the browser tab and trigger a "page unresponsive" warning.
- **Fix Suggestion:** Use PapaParse's `worker: true` option to parse in a background thread, and use the `step` or `chunk` callbacks to stream the data and update counts incrementally.

### 2.4 Flawed Numeric Column Inference
- **Location:** `app.js` (`inferNumericColumn` function)
- **Impact:** `inferNumericColumn` automatically selects the *first* column containing at least one finite number. In many datasets, the first numeric column is an ID (e.g., `1, 2, 3`), a year, or a zip code. Analyzing these for Benford's Law is statistically meaningless.
- **Fix Suggestion:** Parse the headers first, present a `<select>` dropdown UI to let the user choose the column they want to analyze.

### 2.5 Numeric Parsing Fails on Commas and Formats
- **Location:** `app.js` (`leadingDigit` function)
- **Impact:** `Number(value)` evaluates to `NaN` if the CSV contains formatted numbers with thousand separators (e.g., `"1,000"`), currency symbols, or full-width commas. The script skips these valid numbers. Simple string replacement might break European formatting (e.g., `1.234,56`).
- **Fix Suggestion:** Improve numeric string parsing to strip currency symbols, spaces, and correctly extract the leading non-zero digit regardless of European or US formatting.

## 3. MEDIUM

### 3.1 Missing Content Security Policy (CSP)
- **Location:** `index.html`
- **Impact:** Although XSS vectors are mitigated by the use of `.textContent`, the application lacks a Content Security Policy. A naive CSP might block the shared `loader.js` scripts, so care must be taken to allow the pedagogical modules while restricting unknown scripts.
- **Fix Suggestion:** Add a tailored `<meta http-equiv="Content-Security-Policy">` tag.

### 3.2 Service Worker Cache Resiliency
- **Location:** `sw.js` (Install event listener)
- **Impact:** The Service Worker uses `Promise.allSettled` to silently skip missing files during `cache.addAll`. If critical files fail to fetch (like `app.js`), they will be skipped, leaving the user with an incomplete offline experience.
- **Fix Suggestion:** Separate critical and non-critical assets. Use strict `cache.addAll` for critical assets.

## 4. LOW

### 4.1 Missing Shared Dependencies in Standalone Repo
- **Location:** `index.html`, `app.js`, `sw.js`
- **Impact:** The repository hardcodes relative paths to a `../shared/` directory. While this works on production Pages via a fallback (implemented in PR #1), local clones will encounter 404s.
- **Fix Suggestion:** Document the monorepo/workspace structure in `README.md`.

### 4.2 Lack of Automated Testing
- **Location:** Repository-wide
- **Impact:** No automated tests (unit or E2E). Regressions in the mathematical logic will go undetected.
- **Fix Suggestion:** Introduce a minimal test suite (e.g., Jest or Vitest) for core math functions.

### 4.3 Global Namespace Pollution & CSS Overrides
- **Location:** `app.js` and `styles.css`
- **Impact:** Variables are declared in the global scope. The CSS file contains multiple redundant "upgrade batches".
- **Fix Suggestion:** Wrap the application logic in an IIFE. Refactor and consolidate the CSS.
