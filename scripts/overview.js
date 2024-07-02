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
				"errors": {
					"label": 'Errors',
					"type": 'errors',
					"criteria": []
				},
				"warnings": {
					"label": 'Warnings',
					"type": 'warnings',
					"criteria": []
				},
				"notices": {
					"label": 'Notices',
					"type": 'notices',
					"criteria": []
				}
			}
		};


		// append some stuff to all our issues and group all issues by:
		// - type: error, warning, notice
		// - and then by criterium
		// - and then by url (needs its code preview and stuff)

		for (let page of results) {
		
			for (let issue of page.issues) {

				// group issue per criterium by checking if already exists in array of issues and pushing

				const typeLabel = upperCaseFirst(issue.type);
				const critLabel = readableLabel(issue.code);

				if (issue.type == 'error') {
					project.errorCount += 1;
				} else if (issue.type == 'warning') {
					project.warningCount +=1 ;
				} else if (issue.type == 'notice') {
					project.noticeCount += 1;
				}

				let criterium = {
					// 'pageUrl': page.pageUrl,
					// 'documentTitle': page.documentTitle,
					'code': issue.code,
					'type': issue.type,
					'label': critLabel,
					'typeLabel': typeLabel,
					// 'message': issue.message,
					'pageCount': 0,
					'resultCount': 0,
					'pages': []
				};

				let newPage = {
					'pageUrl': page.pageUrl,
					'documentTitle': page.documentTitle,
					'message': issue.message,
					'context': issue.context,
					'selector': issue.selector,
					'issues': []
				};

				let newIssue = {
					// 'pageUrl': page.pageUrl,
					// 'documentTitle': page.documentTitle,
					'code': issue.code,
					'message': issue.message,
					'context': issue.context,
					'selector': issue.selector,
				};

				if (project.issues[issue.type + 's'].criteria.length) {

					// for (let searchedCriterium of project.issues[issue.type + 's'].criteria) {
					project.issues[issue.type + 's'].criteria.find((searchedCriterium) => {

						// console.log('searchedCriterium' + ' = ' + searchedCriterium.code);
						// console.log('criterium' + ' = ' + criterium.code);
						// console.log(searchedCriterium.code === criterium.code);

						if (searchedCriterium.code === criterium.code) {

							if (searchedCriterium.pages.length) {

								// criterium already exists
								// now see if the page exists by checking for the url
								// for (let searchedPage of searchedCriterium.pages) {
								searchedCriterium.pages.find((searchedPage) => {

									// if page already exist
									// console.log('searchedPage' + ' = ' + searchedPage.pageUrl);
									// console.log('newPage' + ' = ' + newPage.pageUrl);
									// console.log(searchedPage.pageUrl === newPage.pageUrl);

									if (searchedPage.pageUrl === newPage.pageUrl) {

										if (searchedPage.issues.length) {

											// we need to check for the issues themselves to have same context & selector or not
											// for (let searchedIssue of searchedPage.issues) {
											searchedPage.issues.find((searchedIssue) => {
												// if exists, don't need to do anything
												if (searchedIssue.code === newIssue.code && searchedIssue.message === newIssue.message && searchedIssue.context === newIssue.context && searchedIssue.selector === newIssue.selector) {
													//
												// no matching issue found, so add new one to existing page
												} else {
													// console.log('no matching issue found, so add new one to existing page: ' + searchedPage.documentTitle);
													searchedPage.issues.push(newIssue);
												}

												return searchedIssue;
											});
											// }

										} else {
											// console.log('no existing issue found, so add new one to existing page: ' + searchedPage.documentTitle);
											searchedPage.issues.push(newIssue);
										}

									// no page match, add it to existing criterium
									} else {
										// console.log('no matching page, add page ' + newPage.documentTitle  + ' to existing criterium: ' + searchedCriterium.label);
										newPage.issues.push(newIssue);
										searchedCriterium.pages.push(newPage);
									}

									return searchedPage;

								});
								// }

							// no matching criteria yet, so add it
							} else {
								// console.log('no matching criteria, add issue to new page: ' + newPage.documentTitle + ' to existing criterium: ' + searchedCriterium.label);
								newPage.issues.push(newIssue);
								searchedCriterium.pages.push(newPage);
							}

						} else {
							// console.log('no matching criteria, add issue to new page: ' + newPage.documentTitle + ' to existing criterium: ' + criterium.label);
							newPage.issues.push(newIssue);
							criterium.pages.push(newPage);
							project.issues[issue.type + 's'].criteria.push(criterium);
						}

						return searchedCriterium;
					});
					// }

				} else {
					// console.log('no existing criteria, add issue to new page: ' + newPage.documentTitle + ' to existing criterium: ' + criterium.label);
					newPage.issues.push(newIssue);
					criterium.pages.push(newPage);
					project.issues[issue.type + 's'].criteria.push(criterium);
				}

			}
		}

		// console.log(project.issues.errors);

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
