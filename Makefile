PY := uv run python

.PHONY: dev check gen-types e2e demo verify-deploy

dev:
	uv run uvicorn src.api.main:app --port 8000 &
	cd web && npm run dev

gen-types:
	$(PY) scripts/export_openapi.py
	cd web && npx -y openapi-typescript src/api/openapi.json -o src/api/schema.d.ts

check:
	uv run ruff check src tests datagen scripts api
	uv run pyright
	uv run pytest -q
	$(MAKE) gen-types
	git diff --exit-code -- web/src/api/openapi.json web/src/api/schema.d.ts
	cd web && npx tsc -b --noEmit
	cd web && npx oxlint src e2e
	cd web && npx vite build

e2e:
	cd web && npx playwright test

demo:
	@echo demo not built yet

verify-deploy:
	uv run python scripts/verify_deploy.py $(URL)
