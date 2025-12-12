# Repository Guidelines

## Project Structure & Module Organization
- `AiNiee.py` launches the PyQt app; run from repo root so resources resolve.
- Core engines live in `ModuleFolders/` (Cache, FileReader/FileOutputer, LLMRequester, TaskExecutor, PromptBuilder, RequestLimiter, etc.); see `ModuleFolders/FileAccessor/README.md` for reader/writer details.
- Plugins reside in `PluginScripts/` with its README; UI pages are in `UserInterface/` and reusable widgets in `Widget/`.
- Shared assets live in `Resource/` (`config.json`, `Localization`, `Regex`, `Prompt`, models, updater); packaging copies this folder alongside `StevExtraction` and `PluginScripts`.
- Build helpers sit in `Tools/pyinstall.py`; example images and sample inputs are under `Example image/` and `test/`.

## Build, Test, and Development Commands
- Create a virtualenv and install deps: `python -m pip install -r requirements.txt` and `python -m pip install --no-deps -r requirements_no_deps.txt`.
- Run locally: `python AiNiee.py`.
- Reproduce CI packaging: `python Tools/pyinstall.py` (PyInstaller onedir; output in `dist/AiNiee`).
- Optional: `python -m pip cache purge` before packing to mirror the workflow.

## Coding Style & Naming Conventions
- Target Python 3.12, 4-space indentation, UTF-8 files.
- Classes use PascalCase (matching filenames); functions/variables use snake_case; constants UPPER_SNAKE_CASE.
- Keep UI strings and prompts in `Resource/Localization` and `Resource/Prompt`; avoid hard-coding literals in logic.
- Add type hints and short docstrings for new public methods; keep imports explicit and sorted.
- Extend readers/writers/plugins by subclassing existing bases and letting managers handle registration rather than custom wiring.

## Testing Guidelines
- No automated suite yet; add focused `unittest` (stdlib) or `pytest` cases under `test/` named `test_<feature>.py` when you introduce logic changes.
- Manual smoke: run `python AiNiee.py`, load a small sample, confirm plugins load, and the FileReader -> TaskExecutor -> UI pipeline stays responsive.
- After building, launch the binary in `dist/AiNiee` and verify resources (Logo, Localization, Regex) resolve without missing-path errors.

## Commit & Pull Request Guidelines
- Recent history uses short imperative summaries (often Chinese); keep titles under ~72 chars, e.g., "Fix cache eviction" or "µ÷ÕûRegex¼ÓÔØ".
- In PRs, describe scope and testing performed, link related issues, and list touched modules.
- Provide before/after screenshots for UI updates and call out prompt/config changes.
- Do not commit secrets in `Resource/config.json`; remove local caches or temp outputs before pushing.

## Security & Configuration Tips
- API keys and endpoints live in `Resource/config.json`; use placeholders in commits and avoid hard-coding secrets elsewhere.
- Strip personal content from sample files before sharing; prefer synthetic fixtures.
- Route new outbound requests through `ModuleFolders/LLMRequester` and `RequestLimiter` to reuse throttling, retries, and logging.
