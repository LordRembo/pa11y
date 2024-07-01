// An example of running Pa11y on multiple URLS
'use strict';

const pa11y = require('../');
const htmlReporter = require('../lib/reporters/html');
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

		for (let key in results) {
			const result = await results[key];
			const html = await htmlReporter.results(result);
			// console.log(result.documentTitle);
			// console.log(result.pageUrl);

			const urlNoProtocol = (result.pageUrl).replace(/^\/\/|^.*?:(\/\/)?/, "");
			const find = '[^a-zA-Z0-9_-]';
			const re = new RegExp(find, 'g');
			const title = (urlNoProtocol).replace(re, '_');

			// console.log(title);

			await writeFile(path.resolve('./exports/' + projectName + '/report-' + title + '.html'), html, err => {
				if (err) {
					console.error(err);
				} else {
					// success
				}
			});
		}

		

	} catch (error) {

		// Output an error if it occurred
		console.error(error.message);

	}
}
