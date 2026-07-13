# Phase 068 CI workflow (pending activation)

`ci-pending/ci.yml` is the CI quality-gate workflow (blocking `tsc` server+main +
`vitest`; non-blocking lint/renderer). It lives here instead of
`.github/workflows/` because it was committed with a Personal Access Token that
lacks the `workflow` scope (GitHub refuses to push workflow files without it).

**To activate:** move it into place and push with a token that has `workflow`
scope (or do it via the GitHub web UI):

    git mv .github/ci-pending/ci.yml .github/workflows/ci.yml
    git commit -m "ci: activate quality-gate workflow"
    git push
