ci: test
	npm run docs

test: lint
	npm test

lint: node_modules
	npm run lint
	npm run format

clean:
	rm -rf node_modules

node_modules: package.json
	npm install

.PHONY: node_modules