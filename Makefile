lint: node_modules
	npm run lint 

test: lint
	npm test

build: node_modules
	node build

node_modules: package.json
	npm install

.PHONY: build