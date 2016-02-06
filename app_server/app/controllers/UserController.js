/**
 * User Controller
 * @module UserController
 */
var rfr = require('rfr');
var Joi = require('joi');
var Boom = require('boom');

var Utility = rfr('app/util/Utility');
var Authenticator = rfr('app/policies/Authenticator');
var SocialMediaAdapter = rfr('app/adapters/social_media/SocialMediaAdapter');
var Service = rfr('app/services/Service');

var logger = Utility.createLogger(__filename);

function UserController(server, options) {
  this.server = server;
  this.options = options;
  this.defaultPlatform = SocialMediaAdapter.PLATFORMS.FACEBOOK;
}
var Class = UserController.prototype;

Class.registerRoutes = function() {
  this.server.route({method: 'GET', path: '/',
                     config: {
                       validate: userListParamsValidator,
                       auth: {scope: Authenticator.SCOPE.ALL}
                     },
                     handler: this.getListOfUsers});

  this.server.route({method: 'GET', path: '/{id}',
                     config: {
                       validate: singleUserValidator,
                       auth: {scope: Authenticator.SCOPE.ALL}
                     },
                     handler: this.getUserById});

  this.server.route({method: 'PUT', path: '/{id}',
                     config: {
                       validate: updateUserValidator,
                       auth: {scope: Authenticator.SCOPE.ALL}
                     },
                     handler: this.updateUser});

  this.server.route({method: 'POST', path: '/login',
                     config: {
                       auth: false,
                       validate: loginPayloadValidator
                     },
                     handler: this.login});

  this.server.route({method: 'GET', path: '/logout',
                     config: {auth: false},
                     handler: this.logout});
};

/* Routes handlers */
Class.getUserById = function(request, reply) {
  Service.getUserById(request.params.id)
  .then(function(user) {
    if (!user || user instanceof Error) {
      reply(Boom.badRequest('Unable to get user with id '+ request.params.id));
      return;
    }

    user = Utility.clearUserProfile(user);
    reply(user);
  });
};

Class.getListOfUsers = function(request, reply) {
  var filters = {
    order: request.query.order
  };

  Service.getListOfUsers(filters).then(function(users) {
    if (!users || users instanceof Error) {
      reply(Boom.badRequest('Unable to get list of users'));
      return;
    }

    reply(users.map(Utility.clearUserProfile));
  });
};

Class.updateUser = function(request, reply) {
  console.log(request.payload);
  var updates = {
    alias: request.payload.alias,
    description: request.payload.description,
    email: request.payload.email
  };

  Service.updateUser(request.auth.credentials.userId, updates)
    .then(function(user) {
      if (!user || user instanceof Error) {
        reply(Boom.badRequest('Unable to update user'));
        return;
      }

      reply(user);
    });
};

Class.login = function(request, reply) {
  var credentials = {
    accessToken: request.payload.accessToken,
    appId: request.payload.appId
  };

  return Authenticator.authenticateUser(this.defaultPlatform, credentials)
  .then(function afterAuthentication(user) {
    if (!user || user instanceof Error) {
      return reply(Boom.badRequest('Failed to authenticate user ' + user));
    }

    var account = {
      userId: user.userId,
      username: user.username,
      password: user.password,
      scope: Authenticator.SCOPE.USER
    };

    request.server.app.cache.set(account.userId, account, 0, function(err) {
      if (err) {
        logger.error(err);
      }

      request.cookieAuth.set(account);

      return reply(Utility.clearUserProfile(user));
    });
  }).catch(function fail(err) {
    return reply(Boom.badRequest('Failed to authenticate user: ' + err));
  });
};

Class.logout = function(request, reply) {
  request.cookieAuth.clear();
  return reply({status: 'OK'});
};

/* Validator for routes */
var singleUserValidator = {
  params: {
    id: Joi.string().guid()
  }
};

var userListParamsValidator = {
  query: {
    order: Joi.any().valid('desc', 'asc').default('asc')
  }
};

var loginPayloadValidator = {
  payload: {
    appId: Joi.string().required(),
    accessToken: Joi.string().required()
  }
};

var updateUserValidator = {
  payload: {
    alias: Joi.string(),
    description: Joi.string(),
    email: Joi.string()
  }
};

exports.register = function(server, options, next) {
  var userController = new UserController(server, options);
  server.bind(userController);
  userController.registerRoutes();
  next();
};

exports.register.attributes = {
  name: 'UserController'
};
