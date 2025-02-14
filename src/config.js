// Function to safely get environment variables
const getEnvVar = (key) => {
  const value = import.meta.env[key];
  if (value === undefined) {
    console.warn(`Environment variable ${key} is not defined`);
    return '';
  }
  return value;
};

// Environment variables configuration
export const config = {
  GITHUB_TOKEN: getEnvVar('VITE_GITHUB_TOKEN'),
  INSTAGRAM_ACCESS_TOKEN: getEnvVar('VITE_INSTAGRAM_ACCESS_TOKEN'),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: getEnvVar('VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID'),
  SLACK_WEBHOOK_URL: getEnvVar('VITE_SLACK_WEBHOOK_URL'),
  INSTAGRAM_USERNAME: getEnvVar('VITE_INSTAGRAM_USERNAME'),
};

// Define environment variable types for better IDE support
/** @type {Record<keyof typeof config, string>} */
export const ENV_KEYS = {
  GITHUB_TOKEN: 'VITE_GITHUB_TOKEN',
  INSTAGRAM_ACCESS_TOKEN: 'VITE_INSTAGRAM_ACCESS_TOKEN',
  INSTAGRAM_BUSINESS_ACCOUNT_ID: 'VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID',
  SLACK_WEBHOOK_URL: 'VITE_SLACK_WEBHOOK_URL',
  INSTAGRAM_USERNAME: 'VITE_INSTAGRAM_USERNAME',
};
