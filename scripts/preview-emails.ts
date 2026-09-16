import fs from 'fs';
import path from 'path';
import {
  getSignupConfirmEmail,
  getPasswordResetEmail,
  getWelcomeEmail,
} from '../lib/email-templates';

const outputDir = path.join(process.cwd(), '.email-previews');
fs.mkdirSync(outputDir, { recursive: true });

const templates = [
  {
    name: 'signup-confirm',
    html: getSignupConfirmEmail(),
    subject: 'Verify your Nexus account',
  },
  {
    name: 'password-reset',
    html: getPasswordResetEmail(),
    subject: 'Reset your Nexus password',
  },
  {
    name: 'welcome',
    html: getWelcomeEmail({
      memberName: 'Jane Smith',
      companyName: 'Acme Corp',
    }),
    subject: 'Welcome to Nexus',
  },
];

templates.forEach(({ name, html, subject }) => {
  const filePath = path.join(outputDir, `${name}.html`);
  fs.writeFileSync(filePath, html);
  console.log(`  ${subject}`);
  console.log(`  -> .email-previews/${name}.html`);
});

console.log('');
console.log('Open these files in your browser to preview.');