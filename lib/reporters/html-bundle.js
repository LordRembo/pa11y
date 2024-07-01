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
report.results = async results => {
	const templateString = await readFile(path.resolve(`${__dirname}/report-bundle.html`), 'utf-8');

	let pages = [];

	// loop all pages
	(results).forEach((result, i) => {

		// split the array into smaller arrays by type (error, warning and notice)
		let reformattedIssues = {
			errors: {
				'label': 'Errors',
				'anchor': 'errors',
				'list': [] 
			},
			warnings: {
				'label': 'Warnings',
				'anchor': 'warnings',
				'list': [] 
			},
			notices: {
				'label': 'Notices',
				'anchor': 'notices',
				'list': []
			}
		};

		(result.issues).forEach((issue, i) => {
			issue.typeLabel = upperCaseFirst(issue.type);
			if (issue.type === 'error') {
				(reformattedIssues.errors.list).push(issue);
			} else if (issue.type === 'warning') {
				(reformattedIssues.warnings.list).push(issue);
			} else if (issue.type === 'notice') {
				(reformattedIssues.notices.list).push(issue);
			}
		});

		const page = {
			idx: i,
			// The current date
			date: new Date(),

			// Result information
			documentTitle: result.documentTitle,
			// issues: results.issues.map(issue => {
			// 	issue.typeLabel = upperCaseFirst(issue.type);
			// 	return issue;
			// }),
			issues: reformattedIssues,
			pageUrl: result.pageUrl,

			// Issue counts
			errorCount: result.issues.filter(issue => issue.type === 'error').length,
			warningCount: result.issues.filter(issue => issue.type === 'warning').length,
			noticeCount: result.issues.filter(issue => issue.type === 'notice').length
		}

		pages.push(page);

	});

	return mustache.render(templateString, {
		project: results[0].project,
		pages: pages
	});
};

// Output error messages
report.error = message => {
	return message;
};

// Utility function to uppercase the first character of a string
function upperCaseFirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}
