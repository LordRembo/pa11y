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

console.log('urls: ' + urlsValue);
console.log('project: ' + projectName);

runExample();

// Utility function to uppercase the first character of a string
function upperCaseFirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function readableLabel(string) {
	//console.log(string);
	let newString = '';

	// cut the start of the string
	const regex01String = 'WCAG2AA\.Principle[0-9]\.Guideline';
	const regex01Line = new RegExp(regex01String, 'g');
	newString = string.replace(regex01Line, '');

	// cut the first numbers at the start, these are the chapter number
	const regex02String = '^(([0-9](_[0-9])).)';
	const regex02Line = new RegExp(regex02String, 'g');
	newString = newString.replace(regex02Line, '');

	
	// get the crit number + the techniques
	// const regex03String = '([0-9](_[0-9])+).';
	// const regex03Line = new RegExp(regex02String, 'g');
	// const newArray = newString.match(regex02Line);
	const newArray = newString.split('.');
	const critNumber = newArray[0].split('_').join('.');
	const techniques = newArray[1];

	// console.log('newString = ' + newString);
	// console.log('critNumber = ' + critNumber);
	// console.log('techniques = ' + techniques);

	// newString = newString.split('.').join(' ');
	// newString = newString.split('_').join('.');

	const criterion = 'Success Criterion ' + critNumber;

	return {
		criterion: criterion,
		techiques: techniques
	};
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

		// check if is a file to import or not
		// if not, assume it's a url

		let isImport = true;
		let urlsArr = [];

		if (!fs.existsSync(path.resolve(urlsValue))) {
			console.log('No file with urls found.');
			console.log('Assuming urls were past instead');
			isImport = false;
			// let 

			urlsArr = urlsValue.split(',');
		}

		// read urls from a list
		if (isImport) {
			const urlsList = await (await readFile(path.resolve(urlsValue), 'utf-8'));
			urlsArr = urlsList.replace(/\r\n/g,'\n').split('\n');
		}

		let singlePage = (urlsArr.length) ? false : true;

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
			'singlePage': singlePage,
			'errorCount' : 0,
			'warningCount': 0,
			'noticeCount': 0,
			'issues': [
				{
					"label": 'Errors',
					"type": 'error',
					"criteria": []
				},
				{
					"label": 'Warnings',
					"type": 'warning',
					"criteria": []
				},
				{
					"label": 'Notices',
					"type": 'notice',
					"criteria": []
				}
			]
		};
		
		let typeIssues = [
			{
				"label": 'Errors',
				"type": 'error',
				'issues': [],
				'criteria': []
			},
			{
				"label": 'Warnings',
				"type": 'warning',
				'issues': [],
				'criteria': []
			},
			{
				"label": 'Notices',
				"type": 'notice',
				'issues': [],
				'criteria': []
			}
		];

		let totalIssues = [];
		let pages = [];

		// merge all page issues into 1 array
		for (let page of results) {

			const newArray = page.issues.map((item, index) => {
				item.pageUrl = page.pageUrl;
				item.documentTitle = page.documentTitle;

				if (singlePage) {
					project.pageUrl = page.pageUrl;
					project.documentTitle = page.documentTitle;
				}
				
				return item;
			});

			totalIssues = totalIssues.concat(newArray);
			
			/*
			pages.push({
				'pageUrl': page.pageUrl,
				'documentTitle': page.documentTitle,
				'issues': []
			});
			*/
		}

		// loop per type: errors, warnings, notices
		for (let index in typeIssues) {

			let key = typeIssues[index].type;
			let count = 0;

			(typeIssues[index]).issues = totalIssues.filter( (issue) => (issue.type === key) );
			count = typeIssues[index].issues.length;
			(typeIssues[index]).issueCount = count;

			// project[key + 'Count'] = typeIssues[index].issues.length;
			console.log(key + ' count = ' + project[key + 'Count']);
						
			// add issues as criteria, to typeIssue criteria array,
			// if it's code does not match the code of an already added criterion
			let index2 = 0;
			(typeIssues[index]).criteria = (typeIssues[index]).issues.reduce((res, itm) => {
				
				const typeLabel = upperCaseFirst(itm.type);
				const critLabel = readableLabel(itm.code).criterion;
				const critTechniques = readableLabel(itm.code).techiques;

				++index2;
				
				// Test if the item is already in the new array
				let result = res.find(item => item.code === itm.code);
				// If not lets add it
				if(!result) {
					const crit = {
						// 'pageUrl': page.pageUrl,
						// 'documentTitle': page.documentTitle,
						'idx': key + '_' + index2,
						'code': itm.code,
						'type': itm.type,
						'label': critLabel,
						'techniques': critTechniques,
						'typeLabel': typeLabel,
						// 'message': issue.message,
						'pageCount': 0,
						'issueCount': 0,
						'pages': pages
					};
					return res.concat(crit);
				}
				// If it is just return what we already have
				return res;
			}, []);

			console.log((typeIssues[index]).criteria.length);

			// TO DO: 
			// - per criterion page, make array of issues with the matching issues

			for (let criterionKey in (typeIssues[index]).criteria) {
				const criterion = (typeIssues[index]).criteria[criterionKey];

				// add pages
				(typeIssues[index]).criteria[criterionKey].pages = (typeIssues[index]).issues.reduce((res, itm) => {
					
					// Test if the item is already in the new array
					let result = res.find(item => item.pageUrl === itm.pageUrl);
					// If not lets add it
					if(!result) {
						const pg = {
							'pageUrl': itm.pageUrl,
							'documentTitle': itm.documentTitle
						};
						return res.concat(pg);
					}
					// If it is just return what we already have
					return res;
				}, []);

				(typeIssues[index]).criteria[criterionKey].pageCount = ((typeIssues[index]).criteria[criterionKey].pages).length;

				(typeIssues[index]).criteria[criterionKey].issueCount = 0;

				for (let pageKey in criterion.pages) {
					const page = criterion.pages[pageKey];
					
					let pageIssues = [];

					pageIssues = (typeIssues[index]).issues.filter((issue) => (issue.type === key && issue.code === criterion.code && issue.pageUrl === page.pageUrl));

					(typeIssues[index]).criteria[criterionKey].pages[pageKey].issues = pageIssues;
					(typeIssues[index]).criteria[criterionKey].pages[pageKey].pageIssueCount = pageIssues.length;
					(typeIssues[index]).criteria[criterionKey].pages[pageKey].pageNumber = pageKey;

					(typeIssues[index]).criteria[criterionKey].issueCount += pageIssues.length;

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
