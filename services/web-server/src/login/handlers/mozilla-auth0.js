const assert = require('assert');
const Debug = require('debug');
const request = require('superagent');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const jwks = require('jwks-rsa');
const User = require('../user');
const PersonAPI = require('../clients/PersonAPI');
const { CLIENT_ID_PATTERN } = require('../../utils/constants');
const encode = require('../../utils/encode');
const decode = require('../../utils/decode');

const debug = Debug('handlers.mozilla-auth0');

class Handler {
  constructor({ name, cfg }) {
    const handlerCfg = cfg.login.handlers[name];

    assert(handlerCfg.domain, `${name}.domain is required`);
    assert(handlerCfg.audience, `${name}.audience is required`);
    assert(handlerCfg.clientId, `${name}.clientId is required`);
    assert(handlerCfg.clientSecret, `${name}.clientSecret is required`);
    assert(handlerCfg.scope, `${name}.scope is required`);

    Object.assign(this, handlerCfg);

    this._personApi = null;
    this._personApiExp = null;
    this.identityProviderId = 'mozilla-auth0';
    // use express-jwt to validate JWTs against auth0
    this.jwtCheck = expressJwt({
      secret: jwks.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${this.domain}/.well-known/jwks.json`,
      }),
      // expect to see our audience in the JWT
      audience: this.apiAudience,
      // and expect a token issued by auth0
      issuer: `https://${this.domain}/`,
      algorithms: ['RS256'],
      credentialsRequired: true,
    });
  }

  // Get a personAPI instance, by requesting an API token as needed.
  // See https://github.com/mozilla-iam/cis/blob/f90ba5033785fd4fb14faf9f066e17356babb5aa/docs/PersonAPI.md#do-you-have-code-examples
  async getPersonApi() {
    if (this._personApi && new Date().getTime() / 1000 < this._personApiExp - 10) {
      return this._personApi;
    }

    const res = await request.post(`https://${this.domain}/oauth/token`)
      .set('content-type', 'application/json')
      .send({
        audience: this.audience,
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
    const accessToken = JSON.parse(res.text).access_token;

    if (!accessToken) {
      throw new Error('did not receive a token from Auth0 /oauth/token endpoint');
    }

    // Parse the token just enough to figure out when it expires.
    const decoded = jwt.decode(accessToken);
    const expires = decoded.exp;

    // Create a new
    this._personApi = new PersonAPI({ accessToken });
    this._personApiExp = expires;

    return this._personApi;
  }

  async getUser({ userId }) {
    const personApi = await this.getPersonApi();
    const userProfile = await personApi.getProfileFromUserId(userId);
    const user = new User();

    if ('active' in userProfile && !userProfile.active) {
      debug('user is not active; rejecting');
      return;
    }

    if (!userProfile || !userProfile.user_id) {
      return;
    }

    user.identity = this.identityFromProfile(userProfile);

    if (!user.identity) {
      debug('No recognized identity providers');
      return;
    }

    // take a user and attach roles to it
    this.addRoles(userProfile, user);

    return user;
  }

  // expose method
  async userFromRequest(req, res) {
    // check the JWT's validity, setting req.user if sucessful
    try {
      await new Promise((resolve, reject) =>
        this.jwtCheck(req, res, (err) => err ? reject(err) : resolve()));
    } catch (err) {
      debug(`error validating jwt: ${err}`);
      return;
    }

    debug(`received valid access_token for subject ${req.user.sub}`);

    const scopes = req.user.scope ? req.user.scope.split(' ') : [];

    if (!scopes.includes('taskcluster-credentials')) {
      debug(`request did not have the 'taskcluster-credentials' scope; had ${req.user.scope}`);
      return;
    }

    try {
      const user = this.getUser({ userId: req.user.sub });

      user.expires = new Date(req.user.exp * 1000);

      return user;
    } catch (err) {
      debug(`error retrieving profile from request: ${err}\n${err.stack}`);
      return;
    }
  }

  // exposed method
  userFromClientId(clientId) {
    const patternMatch = CLIENT_ID_PATTERN.exec(clientId);
    const identity = patternMatch && patternMatch[1];

    if (!identity) {
      return;
    }

    let encodedUserId = identity.split('/')[1];

    // Reverse the username appending, stripping the username.
    if (encodedUserId.startsWith('github|') || encodedUserId.startsWith('oauth2|firefoxaccounts|')) {
      encodedUserId = encodedUserId.replace(/\|[^|]*$/, '');
    }

    return this.getUser({ userId: decode(encodedUserId) });
  }

  identityFromProfile(profile) {
    const userId = profile.user_id.value;
    let identity = `${this.identityProviderId}/${encode(userId)}`;

    // if the identity is a github or firefox-accounts identity, then we want
    // to add the username after a `|` character, to disambiguate the
    // otherwise-numeric usernames
    if (userId.startsWith('github|')) {
      for (let {provider, connection, user_id: github_user_id} of profile.identities) {
        if (provider === 'github' && connection === 'github') {
          // we expect the auth0 user_id to be `github|<githubUserId>`
          assert(userId.endsWith(github_user_id.toString()),
            `Auth0 user_id ${userId} not formatted as expected (expected |${github_user_id})`);
          identity += `|${profile.nickname}`;
          break;
        }
      }
    } else if (userId.startsWith('oauth2|firefoxaccounts|')) {
      for (let {provider, connection, profileData} of profile.identities) {
        if (provider === 'oauth2' && connection === 'firefoxaccounts') {
          // we expect the auth0 user_id to be `oauth|firefoxaccounts|<fxa_sub>`
          // sometimes fxa_sub is on profileData, sometimes on the profile
          const fxa_sub = profileData ? profileData.fxa_sub : profile.fxa_sub;
          assert(userId.endsWith(fxa_sub),
            `Auth0 user_id ${userId} not formatted as expected`);
          const email = profileData ? profileData.email : profile.email;
          identity += `|${email}`;
          break;
        }
      }
    }

    return identity;
  }

  addRoles(profile, user) {
    const accessInformation = profile.access_information;
    const { ldap, mozilliansorg, hris } = accessInformation;

    // Non-prefixed groups are what is known as Mozilla LDAP groups. Groups prefixed by a provider
    // name and underscore are provided by a specific group engine. For example,
    // `providername_groupone` is provided by `providername`. Per https://goo.gl/bwWjvE.
    // For our own purposes, if the prefix is not mozilliansorg. then we treat it as an ldap group
    const groups = [
      ...(ldap && ldap.values ? Object.keys(ldap.values).map(group => `mozilla-group:${group}`) : []),
      ...(hris && hris.values ? Object.keys(hris.values).map(group => `hris_${group}`) : []),
      ...(mozilliansorg && mozilliansorg.values ? Object.keys(mozilliansorg.values).map(group => `mozilliansorg_${group}`) : []),
    ];

    user.addRole(...groups);
  }
}

module.exports = Handler;
