# SecureSync AI Release Checklist

Use this checklist before tagging a release candidate.

## 1) Security and Access
- [ ] `JWT_SECRET` is non-default and rotated for target environment.
- [ ] `PARTNER_PROVIDER_MODE` and `STRICT_MOCK_PARTNER_IDS` are set intentionally.
- [ ] Admin access controls are verified for all `/api/v1/admin/*` routes.
- [ ] Webhook verification is enabled with a valid secret in non-local deployments.
- [ ] Docker services are exposed only on localhost for local deployments.
- [ ] Kubernetes secret `securesync-secrets` is created from secure values (not template placeholders).

## 2) Backend Correctness
- [ ] Run `pytest -q backend/tests` and confirm all required suites pass.
- [ ] Confirm premium clamp boundary tests pass.
- [ ] Confirm trigger threshold boundary tests pass.
- [ ] Confirm strict mock partner verification tests pass.

## 3) Frontend Quality
- [ ] Run `npm run test` in `frontend` and confirm all tests pass.
- [ ] Run `npm run build` in `frontend` and confirm production build succeeds.
- [ ] Verify critical flow manually: onboarding -> login -> verification -> premium -> purchase -> dashboard.

## 4) CI Expectations
- [ ] GitHub CI backend and frontend jobs pass.
- [ ] Frontend dependency audit has no high/critical vulnerabilities.
- [ ] Integration status workflow passes.

## 5) Docs and Ops
- [ ] `README.md` matches runtime behavior and trigger matrix.
- [ ] `SETUP.md` matches current commands and environment requirements.
- [ ] Deployment manifests and env templates are up to date.

## Residual Risks / Deferred Items
- OTP behavior changes are deferred by scope decision.
- Live Swiggy/Zomato provider integration is deferred; mock provider mode remains primary for demos.
- Full frontend E2E and visual-regression automation are pending future milestone work.
