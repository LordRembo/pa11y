// An example of running Pa11y on multiple URLS
'use strict';

const pa11y = require('../');
const htmlReporter = require('../lib/reporters/html-overview');
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);


// Checks for --urls & --project and if it has a value

const urlsIndex = process.argv.indexOf('--urls');
const projectIndex = process.argv.indexOf('--project');
let urlsValue;
let projectValue;

if (urlsIndex > -1) {
  // Retrieve the value after --custom
  urlsValue = process.argv[urlsIndex + 1];
} else {
	console.error('please pass url or list of urls (file) using the `--urls` attribute');
}
if (projectIndex > -1) {
  // Retrieve the value after --custom
  projectValue = process.argv[projectIndex + 1];
} else {
	console.error('please pass a project name using the `--project` attribute');
}

const projectName = (projectValue || 'undefined');

// console.log(urlsValue);
// console.log(projectName);

runExample();

// Utility function to uppercase the first character of a string
function upperCaseFirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function readableLabel(string) {
	const spacedString = string.split('.').join(' ');
	const dottedString = spacedString.split('_').join('.');
	return dottedString;
}

// Async function required for us to use await
async function runExample() {
	try {

		// Put together some options to use in each test
		const options = {
			includeNotices: true,
			includeWarnings: true,
			log: {
				debug: console.log,
				error: console.error,
				info: console.log,
			},
			runners: [
				// 'axe',
				'htmlcs'
			],
			reporter: 'html',
			userAgent: 'A11Y TESTS',
			wait: 500
		};

		// const projectName = 'dropsolid';
		// const urls = [
		// 	'https://dropsolid.com/en/',
		// 	'https://dropsolid.com/en/about-us/'
		// ];

		// read urls from a list
		// const urlsList = await readFile(path.resolve(urlsValue), 'utf-8');
		const urlsList = await (await readFile(path.resolve(urlsValue), 'utf-8'));
		let urlsArr = urlsList.replace(/\r\n/g,'\n').split('\n');

		let resultsArr = [];

		for (let url of urlsArr) {
			let myOptions = options;
			const urlNoProtocol = url.replace(/^\/\/|^.*?:(\/\/)?/, "");
			const find = '[^a-zA-Z0-9_-]';
			const re = new RegExp(find, 'g');
			const title = (urlNoProtocol).replace(re, '_');

			myOptions['screenCapture'] = path.resolve(__dirname + '/../exports/' + projectName + '/report-' + title + '-screenshot.png')
			resultsArr.push(pa11y(url, options))
		}

		// Create a folder to group the pages
		const dir = './exports/' + projectName;

		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}

		// Run tests against multiple URLs
		// results = await Promise.all([
		// 	pa11y('https://dropsolid.com/en/', options),
		// 	pa11y('https://dropsolid.com/en/about-us/', options)
		// ]);
		const results = await Promise.all(resultsArr);

		let project = {
			'name': projectName,
			'date': new Date(),
			'errorCount' : 0,
			'warningCount': 0,
			'noticeCount': 0,
			'issues': {
				"error": {
					"label": 'Errors',
					"type": 'error',
					"criteria": []
				},
				"warning": {
					"label": 'Warnings',
					"type": 'warning',
					"criteria": []
				},
				"notice": {
					"label": 'Notices',
					"type": 'notice',
					"criteria": []
				}
			}
		};
		
		let typeIssues = {
			'error': {
				"label": 'Errors',
				"type": 'error',
				'issues': [],
				'criteria': []
			},
			'warning': {
				"label": 'Warnings',
				"type": 'warning',
				'issues': [],
				'criteria': []
			},
			'notice': {
				"label": 'Notices',
				"type": 'notice',
				'issues': [],
				'criteria': []
			}
		};

		let totalIssues = [];
		let pages = [];

		// merge all page issues into 1 array
		for (let page of results) {

			const newArray = page.issues.map((item, index) => {
				item.pageUrl = page.pageUrl;
				return item;
			});

			totalIssues = totalIssues.concat(newArray);

			pages.push({
				'pageUrl': page.pageUrl,
				'documentTitle': page.documentTitle,
				'issues': []
			});
		}

		// loop per type: errors, warnings, notices
		for (let key in typeIssues) {

			(typeIssues[key]).issues = totalIssues.filter( (issue) => (issue.type === key) );
			project[key + 'Count'] = typeIssues[key].issues.length;
			console.log(key + ' count = ' + project[key + 'Count']);
						
			// add issues as criteria, to typeIssue criteria array,
			// if it's code does not match the code of an already added criterium
			(typeIssues[key]).criteria = (typeIssues[key]).issues.reduce((res, itm) => {
				
				const typeLabel = upperCaseFirst(itm.type);
				const critLabel = readableLabel(itm.code);
				
				// Test if the item is already in the new array
				let result = res.find(item => item.code === itm.code);
				// If not lets add it
				if(!result) {
					const crit = {
						// 'pageUrl': page.pageUrl,
						// 'documentTitle': page.documentTitle,
						'code': itm.code,
						'type': itm.type,
						'label': critLabel,
						'typeLabel': typeLabel,
						// 'message': issue.message,
						'pageCount': pages.length,
						'resultCount': 0,
						'pages': pages
					};
					return res.concat(crit);
				}
				// If it is just return what we already have
				return res;
			}, []);

			console.log((typeIssues[key]).criteria.length);

			// TO DO: 
			// - per criterium page, make array of issues with the matching issues

			for (let criteriumKey in (typeIssues[key]).criteria) {
				const criterium = (typeIssues[key]).criteria[criteriumKey];
				for (let pageKey in criterium.pages) {
					const page = criterium.pages[pageKey];
					(typeIssues[key]).criteria[criteriumKey].pages[pageKey].issues = (typeIssues[key]).issues.filter((issue) => issue.type === key && issue.code === criterium.code && issue.pageUrl === page.pageUrl);
					// console.log('----');
					// console.log(key);
					// console.log(criterium.code);
					// console.log(page.pageUrl);
					// console.log('----');
				}
			}

		}

		project.issues = typeIssues;

		// console.log(project.issues.error.issues[0]);
		// console.log(project.issues.error.issues.length);

		const html = await htmlReporter.results(project);
		await writeFile(path.resolve('./exports/' + projectName + '-overview.html'), html, err => {
			if (err) {
				console.error(err);
			} else {
				// success
			}
		});

	} catch (error) {

		// Output an error if it occurred
		console.error(error.message);

	}
}
