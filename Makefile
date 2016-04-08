coverage: tests
	npm run coverage

tests: lint
	npm test

lint: node_modules
	npm run lint

cleanup:
	rm -rf node_modules coverage

node_modules: cleanup package.json
	npm install

.PHONY: node_modules