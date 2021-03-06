TESTS = test/*.js
REPORTER = spec

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 10000 \
		$(TESTS)

test-cov: lib-cov
	@FLYNN_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov: clean
	@jscoverage lib lib-cov

clean:
	@rm -rf lib-cov
	@rm -f coverage.html

.PHONY: test lib-cov test-cov clean
