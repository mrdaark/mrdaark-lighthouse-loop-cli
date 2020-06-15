const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');
const {range, get, concat} = require('lodash');
const requiredParams = ['url', 'paramName'];

const isHelp = process.argv.slice(2).reduce((res, param) => {
    return res || /^--help$/.test(param)
}, false);

if (isHelp) {
    console.log('Help:\n')
    console.log('  url: url to test');
    console.log('  paramName: parameter to average');
    console.log('  count: number of measurements');
    console.log('\nExample: node run.js --url=https://softgamings.wlc.localhost/ --count=5 --paramName=lhr.audits.first-contentful-paint.numericValue\n');
    return;
}

const rx = /^--(.*)?\=(.*)$/;

const args = {};

process.argv.slice(2).map((param) => {
    const p = param.match(rx);
    if (p && p.length === 3) {
        return {
            name: p[1],
            value: p[2]
        };
    } else {
        return {};
    }

}).forEach((param) => {
    if (param && param.name && param.value) {
        args[param.name] = param.value;
    }
});

const isAllRequiredParams = requiredParams.reduce((res, param) => {
    return res && Object.keys(args).includes(param);
}, true);

if (!isAllRequiredParams) {
    console.log('Not all required params');
    return;
}

const url = args.url;
const count = args.count || 1;
const paramName = args.paramName;

const getReport = (url) => {
    return chromeLauncher.launch({chromeFlags: ['--headless', '--ignore-certificate-errors']}).then((chrome) => {
        const options = {output: 'json', onlyCategories: ['performance'], port: chrome.port};
        return lighthouse(url, options).then((results) =>
            chrome.kill().then(() => (results))
        );
    });
}

range(count).reduce(async (res, index) => {
    return res.then((result) => {
        return new Promise((resolve) => {
            console.log('attempt: ', index + 1);
            getReport(url).then((report) => {
                console.log('result:', get(report, paramName));
                resolve(concat(result, get(report, paramName)));
            });
        })
    });
}, Promise.resolve([])).then((result) => {
    console.log('average result', result.reduce((sum, item) => sum + item, 0) / result.length);
});
