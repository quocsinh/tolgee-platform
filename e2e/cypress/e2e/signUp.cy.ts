import { HOST } from '../common/constants';
import { getInput } from '../common/xPath';
import {
  createProject,
  deleteAllEmails,
  deleteUserWithEmailVerification,
  disableEmailVerification,
  enableEmailVerification,
  getParsedEmailVerification,
  getRecaptchaSiteKey,
  getUser,
  login,
  logout,
  setProperty,
  setRecaptchaSecretKey,
  setRecaptchaSiteKey,
  v2apiFetch,
} from '../common/apiCalls/common';
import { assertMessage, gcy } from '../common/shared';
import { loginWithFakeGithub } from '../common/login';
import { ProjectDTO } from '../../../webapp/src/service/response.types';

const TEST_USERNAME = 'johndoe@doe.com';

const createProjectWithInvitation = (name: string) => {
  return login().then(() =>
    createProject({
      name,
      languages: [
        {
          tag: 'en',
          name: 'English',
          originalName: 'English',
          flagEmoji: '🇬🇧',
        },
      ],
    }).then((projectResponse: { body: ProjectDTO }) => {
      return v2apiFetch(`projects/${projectResponse.body.id}/invite`, {
        method: 'PUT',
        body: { type: 'VIEW', name: 'Franta' },
      }).then((invitation) => {
        logout();
        return {
          projectId: projectResponse.body.id,
          invitationLink: `${HOST}/accept_invitation/${invitation.body.code}`,
        };
      });
    })
  );
};

context('Sign up', () => {
  let recaptchaSiteKey;

  beforeEach(() => {
    getRecaptchaSiteKey().then((it) => (recaptchaSiteKey = it));
    logout();
    visit();
    deleteUserWithEmailVerification(TEST_USERNAME);
    deleteAllEmails();
    enableEmailVerification();
  });

  afterEach(() => {
    deleteUserWithEmailVerification(TEST_USERNAME);
    setRecaptchaSiteKey(recaptchaSiteKey);
  });

  describe('without recaptcha', () => {
    beforeEach(() => {
      setRecaptchaSiteKey(null);
    });

    it('Signs up without recaptcha', () => {
      visit();
      cy.intercept('/**/sign_up', (req) => {
        expect(req.body.recaptchaToken).be.undefined;
      }).as('signUp');
      fillAndSubmitForm();
      cy.wait(['@signUp']);
      cy.contains(
        'Thank you for signing up. To verify your e-mail please follow instructions sent to provided e-mail address.'
      ).should('be.visible');
      setProperty('recaptcha.siteKey', recaptchaSiteKey);
    });
  });

  it('Will fail on recaptcha', () => {
    setRecaptchaSecretKey('negative_dummy_secret_key');
    cy.intercept('/**/sign_up', (req) => {
      expect(req.body.recaptchaToken).have.length.greaterThan(10);
    }).as('signUp');
    fillAndSubmitForm();
    cy.wait(['@signUp']);
    setRecaptchaSecretKey('dummy_secret_key');
    cy.contains('You are robot').should('be.visible');
  });

  it('Will sign up', () => {
    cy.intercept('/**/sign_up', (req) => {
      expect(req.body.recaptchaToken).have.length.greaterThan(10);
    }).as('signUp');
    fillAndSubmitForm();
    cy.wait(['@signUp']);
    cy.contains(
      'Thank you for signing up. To verify your e-mail please follow instructions sent to provided e-mail address.'
    ).should('be.visible');
    getUser(TEST_USERNAME).then((u) => {
      expect(u[0]).be.equal(TEST_USERNAME);
      expect(u[1]).be.not.null;
    });
    getParsedEmailVerification().then((r) => {
      cy.wrap(r.fromAddress).should('contain', 'no-reply@tolgee.io');
      cy.wrap(r.toAddress).should('contain', TEST_USERNAME);
      cy.visit(r.verifyEmailLink);
      assertMessage('E-mail was verified');
    });
  });

  it('will sign up without email verification', () => {
    disableEmailVerification();
    fillAndSubmitForm();
    assertMessage('Thanks for your sign up!');
    cy.gcy('global-base-view-title').contains('Projects');
  });

  it('will sign up with project invitation code', () => {
    disableEmailVerification();
    createProjectWithInvitation('Test').then(({ invitationLink }) => {
      logout();
      cy.log(window.localStorage.getItem('jwtToken'));
      cy.visit(HOST + '/sign_up');
      fillAndSubmitForm();
      cy.contains('Projects').should('be.visible');
      cy.visit(invitationLink);
      assertMessage('Invitation successfully accepted');
    });
  });

  it('Remembers code after sign up', () => {
    disableEmailVerification();
    createProjectWithInvitation('Crazy project').then(({ invitationLink }) => {
      cy.visit(invitationLink);
      assertMessage('Log in or sign up first please');
      cy.visit(HOST + '/sign_up');
      fillAndSubmitForm();
      assertMessage('Thanks for your sign up!');
      cy.contains('Crazy project').should('be.visible');
    });
  });

  it('Works with github signup', () => {
    disableEmailVerification();
    createProjectWithInvitation('Crazy project').then(({ invitationLink }) => {
      cy.visit(HOST + '/login');
      loginWithFakeGithub();
      cy.contains('Projects').should('be.visible');
      cy.visit(invitationLink);
      cy.contains('Crazy project').should('be.visible');
    });
  });

  it('Remember code after github signup', () => {
    disableEmailVerification();
    createProjectWithInvitation('Crazy project').then(({ invitationLink }) => {
      cy.visit(invitationLink);
      assertMessage('Log in or sign up first please');
      cy.intercept('/api/public/authorize_oauth/github**http://**').as(
        'GithubSignup'
      );
      loginWithFakeGithub();
      cy.wait('@GithubSignup').then((interception) => {
        assert.isTrue(interception.request.url.includes('invitationCode'));
      });
    });
  });
});

const fillAndSubmitForm = () => {
  cy.waitForDom();
  cy.xpath(getInput('name')).should('be.visible').type('Test user');
  cy.xpath(getInput('email')).type(TEST_USERNAME);
  cy.xpath(getInput('password')).type('password');
  cy.xpath(getInput('passwordRepeat')).type('password');
  gcy('sign-up-submit-button').click();
};

const visit = () => cy.visit(HOST + '/sign_up');
