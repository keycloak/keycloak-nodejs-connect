tests: lint
	npm run test

lint: node_modules
	npm run lint
	npm run format

cleanup:
	rm -rf node_modules

node_modules: package.json
	npm install

.PHONY: node_modules
