'use strict';

const fs = require('fs');
const mustache = require('mustache');
const path = require('path');
const {promisify} = require('util');
const readFile = promisify(fs.readFile);

const report = module.exports = {};

// Pa11y version support
report.supports = '^8.0.0 || ^8.0.0-alpha || ^8.0.0-beta';

// Compile template and output formatted results
report.results = async project => {
	const templateString = await readFile(path.resolve(`${__dirname}/report-overview.html`), 'utf-8');

	// console.log(project.issues);

	return mustache.render(templateString, project);
};

// Output error messages
report.error = message => {
	return message;
};

// Utility function to uppercase the first character of a string
function upperCaseFirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
