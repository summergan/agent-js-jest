const getOptions = require('./utils/getOptions');
const RPClient = require('reportportal-client');

const reportTests = (client, launchObj, suiteObj, tests) => {
  tests.forEach((test) => {
    const {
      ancestorTitles,
      duration,
      failureMessages,
      fullName,
      location,
      numPassingAsserts,
      status,
      title,
    } = test;

    const testObj = client.startTestItem({
      name: title,
      type: 'TEST',
    }, launchObj.tempId, suiteObj.tempId);

    const testFinishObj = client.finishTestItem(testObj.tempId, {
    });

  });

};

const reportSuites = (client, launchObj, suites) => {
  const appDirectory = process.cwd();
  suites.forEach((suite) => {
    const {
      console,
      failureMessage,
      numFailingTests,
      numPassingTests,
      numPendingTests,
      perfStats,
      snapshot,
      testFilePath,
      testResults,
      coverage,
      sourceMaps,
      skipped,
      displayName,
      leaks,
    } = suite;

    const suiteObj = client.startTestItem({
      name: testFilePath.replace(appDirectory, ''),
      start_time: perfStats.start,
      type: 'SUITE',
    }, launchObj.tempId);

    reportTests(client, launchObj, suiteObj, testResults);

    const suiteFinishObj = client.finishTestItem(suiteObj.tempId, {
      end_time: perfStats.end,
    });

  });

};

const processor = (report, reporterOptions = {}) => {
  // If jest-junit is used as a reporter allow for reporter options
  // to be used. Env and package.json will override.
  const options = getOptions.options(reporterOptions);

  const rpClient = new RPClient({
    token: process.env.RP_TOKEN,
    endpoint: options.endpoint,
    launch: 'Unit Tests',
    project: options.project,
  });
  const endTime = rpClient.helpers.now();

  const launchObj = rpClient.startLaunch({
    name: 'Unit Tests',
    start_time: report.startTime,
  });

  reportSuites(rpClient, launchObj, report.testResults);

  const launchFinishObj = rpClient.finishLaunch(launchObj.tempId, {
    end_time: endTime,
  });

  // Jest 18 compatibility
  return report;
};

// This is an old school "class" in order
// for the constructor to be invoked statically and via "new"
// so we can support both testResultsProcessor and reporters
// TODO: refactor to es6 class after testResultsProcessor support is removed
function JestReportPortal (globalConfig, options) {
  this.globalConfig = globalConfig;
  this.options = options;

  this.onRunComplete = (contexts, results) => {
    if (process.env.RP_TOKEN === undefined) {
      console.log('No ReportPortal token (RP_TOKEN) set. Skipping upload.');
    } else {
      processor(results, this.options);
    }
  };
}

module.exports = JestReportPortal;
