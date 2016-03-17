#!/usr/bin/env node

var inquirer = require('inquirer');
var simpleGit = require('simple-git')(process.cwd());
var fs = require('fs');
var ejs = require('ejs');
var tpl = fs.readFileSync(__dirname + '/template.ejs', 'utf-8');
var reviews = fs.readFileSync(__dirname + '/review.ejs', 'utf-8');
var chalk = require('chalk');
var ncp = require('copy-paste');
var _ = require('underscore');
var opn = require('opn');

var branch = '';
var ticket = '';
var project = '';
var origin = '';

var getCodereview = function(answers, cb) {
  simpleGit.getRemotes(true, function(err, res) {
    if(!err) {
      var branch = 'issue-' + answers.ticket;
      origin  = _.findWhere(res, {name: 'origin'}).refs.fetch ;
      project = origin.split('/')[1].replace('.git', '');

      simpleGit.log(['--grep=' + answers.ticket, '--author=Robbie Bardijn', '--no-merges'], function(err, res) {
        cb(ejs.render(reviews, {
          branch: branch,
          project: project,
          commitsCount: res.total,
          commits: res.all,
        }));
      });
    }
  });
};

var askQuestions = function(branch) {
  var questions = [];
  questions.push({
    type: 'input',
    name: 'ticket',
    message: function() {
      if(branch !== '?') {
        return 'TICKET: Please enter your ticket. Maybe it is?';
      } else {
        return 'TICKET: Please enter your ticket.';
      }
    },
    default: branch,
    validate: function (value) {
      if(value === '' || value === '?') {
        return 'You must enter a ticket.';
      }

      if (value.match(/^(master|acc|staging|prod)$/)) {
        return 'You entered an enviroment branch for the ticket, this is not going to work :)';
      }

      if (value.indexOf('issue') > -1) {
        return 'You should not use the prefix issue in your ticketname, this is not going to work :)';
      }


      return true;
    }
  });

  questions.push({
    type: 'input',
    name: 'info',
    message: 'GENERAL INFO: Please provide the information needed for your colleagues.',
    default: 'The issue was solved'
  });

  questions.push({
    type: 'checkbox',
      name: 'git',
      message: 'GIT: In what branches was your issue merged?',
      choices: [{
        name: 'master',
        value: 'master',
        checked: true
      }, {
        name: 'dev',
        value: 'dev',
        checked: true
      }, {
        name: 'acc',
        value: 'acc',
        checked: true
      }, {
        name: 'staging',
        value: 'staging',
        checked: false
      }, {
        name: 'prod',
        value: 'prod',
        checked: false
      }]
    });

  questions.push({
    type: 'checkbox',
      name: 'deploy',
      message: 'DEPLOY: On what envs was your issue deployed?',
      choices: [{
        name: 'development',
        value: 'Development',
        checked: true
      }, {
        name: 'acceptation',
        value: 'Acceptation(QA)',
        checked: true
      }, {
        name: 'staging',
        value: 'Staging',
        checked: false
      }, {
        name: 'production',
        value: 'Production',
        checked: false
      }]
    });

  questions.push({
    type: 'input',
    name: 'screenshot',
    message: 'SCREENSHOT: You can add additional screenshots of the solution here.'
  });

  questions.push({
    type: 'input',
    name: 'url',
    message: 'URL: Please be kind for QA and add a test url.'
  });

  inquirer.prompt(questions, function (answers) {
    getCodereview(answers, function(codereview) {
      answers.codereview = codereview;
      var msg = ejs.render(tpl, answers);
      console.log(chalk.black.bgGreen('SUCCESS') + chalk.green(' Successfully generated your message!'));

      ncp.copy(msg, function () {
        console.log(chalk.black.bgGreen('SUCCESS') + chalk.green(' Copied to clipboard...opening ticket.'));
        opn('https://ausybenelux.atlassian.net/browse/' + answers.ticket, {wait: false});
      });
    });
  });
};

if (fs.existsSync(process.cwd() + '/.git')) {
  simpleGit.revparse(['--abbrev-ref', 'HEAD'], function(err, res) {
    if(!err) {
      res = res.replace(/(\r\n|\n|\r)/gm,'');

      branch = res;
      if(branch.indexOf('issue-') > -1) {
        ticket = branch.substr(6);
      }

      askQuestions(ticket);
    }
  });
} else {
  console.log(chalk.black.bgYellow('WARNING') + chalk.yellow(' You are NOT in a git repository!'));
  askQuestions('?');
}







