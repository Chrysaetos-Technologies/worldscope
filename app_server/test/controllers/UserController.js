var rfr = require('rfr');
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var Code = require('code');

var Router = rfr('app/Router.js');

lab.experiment('UserController Tests', function () {
  lab.test('Get list of users', function (done) {
    Router.inject('/api/users', function (res) {
      Code.expect(res.result).to.equal('Hello Sharmine!');
      done();
    });
  });

  lab.test('Valid id', function (done) {
    Router.inject('/api/users/213', function (res) {
      Code.expect(res.result).to.equal('Hello 213!');
      done();
    });
  });

  lab.test('Get list of users', function (done) {
    Router.inject('/api/users/asd', function (res) {
      var errorMsg = 'child "id" fails because ["id" must be a number]';
      Code.expect(res.result.statusCode).to.equal(400);
      Code.expect(res.result.message).to.equal(errorMsg);
      done();
    });
  });

  lab.test('Valid login', function (done) {
    Router.inject({method: 'POST', url: '/api/users/login'}, function (res) {
      Code.expect(res.result).to.equal('Logged in!');
      done();
    });
  });

  lab.test('Valid logout', function (done) {
    Router.inject({method: 'POST', url: '/api/users/logout'}, function (res) {
      Code.expect(res.result).to.equal('Logged out!');
      done();
    });
  });
});
